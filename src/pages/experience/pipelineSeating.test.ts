import { describe, expect, it } from 'vitest'
import {
  ATHENA_CAPACITY,
  SQS_VISIBLE_SLOTS,
  sqsQueueSeat,
} from './pipelineData'
import {
  DLQ_COLUMNS,
  DLQ_ROWS_BEFORE_PACKING,
  createSeating,
  type SeatedFile,
} from './pipelineSeating'

describe('the SQS queue', () => {
  it('seats arrivals from the front of the queue backwards', () => {
    const seating = createSeating()
    seating.enqueueSqs('a')
    seating.enqueueSqs('b')
    const layout = seating.enqueueSqs('c')

    expect(layout).toEqual([
      { id: 'a', seat: sqsQueueSeat(0) },
      { id: 'b', seat: sqsQueueSeat(1) },
      { id: 'c', seat: sqsQueueSeat(2) },
    ])
  })

  it('shuffles everything behind a departure forward into its slot', () => {
    const seating = createSeating()
    for (const id of ['a', 'b', 'c']) seating.enqueueSqs(id)

    // Lambda takes the front of the queue, not an arbitrary member.
    const layout = seating.dequeueSqs('a')

    expect(layout).toEqual([
      { id: 'b', seat: sqsQueueSeat(0) },
      { id: 'c', seat: sqsQueueSeat(1) },
    ])
  })

  it('closes the gap when a file leaves from the middle', () => {
    const seating = createSeating()
    for (const id of ['a', 'b', 'c']) seating.enqueueSqs(id)

    expect(seating.dequeueSqs('b')).toEqual([
      { id: 'a', seat: sqsQueueSeat(0) },
      { id: 'c', seat: sqsQueueSeat(1) },
    ])
  })

  it('reports nothing moved when a file that was never queued leaves', () => {
    const seating = createSeating()
    seating.enqueueSqs('a')

    // runSegment calls this on every departure, including the many that
    // never went near SQS. Redrawing the queue for those would restart the
    // slide animation on files that did not move.
    expect(seating.dequeueSqs('somewhere-else')).toBeNull()
    expect(seating.sqsDepth()).toBe(1)
  })

  it('does not queue the same file twice', () => {
    const seating = createSeating()
    seating.enqueueSqs('a')
    const layout = seating.enqueueSqs('a')

    expect(layout).toHaveLength(1)
    expect(seating.sqsDepth()).toBe(1)
  })

  it('keeps a backlog past the visible slots rather than dropping it', () => {
    const seating = createSeating()
    const ids = Array.from({ length: SQS_VISIBLE_SLOTS + 3 }, (_, i) => `f${i}`)
    for (const id of ids) seating.enqueueSqs(id)

    expect(seating.sqsDepth()).toBe(ids.length)
    // A redrive has to be able to clear the whole backlog, not just the
    // part of it that happens to fit inside the drawing of the channel.
    for (const id of ids) seating.dequeueSqs(id)
    expect(seating.sqsDepth()).toBe(0)
  })
})

describe("Athena's working set", () => {
  it('evicts nothing until the grid is full', () => {
    const seating = createSeating()
    for (let i = 0; i < ATHENA_CAPACITY; i++) {
      expect(seating.parkAtAthena(`f${i}`)).toEqual([])
    }
  })

  it('evicts the oldest record to make room, one for one', () => {
    const seating = createSeating()
    for (let i = 0; i < ATHENA_CAPACITY; i++) seating.parkAtAthena(`f${i}`)

    expect(seating.parkAtAthena('next')).toEqual(['f0'])
    expect(seating.parkAtAthena('after')).toEqual(['f1'])
  })
})

describe('per-node seats', () => {
  it('hands out a different slot each time so two files do not stack', () => {
    const seating = createSeating()
    const slots = [0, 1, 2].map(() => seating.nextSeatSlot('s3lake'))

    expect(new Set(slots).size).toBe(slots.length)
  })

  it('counts each node independently', () => {
    const seating = createSeating()
    seating.nextSeatSlot('s3lake')
    seating.nextSeatSlot('s3lake')

    expect(seating.nextSeatSlot('output')).toBe(seating.nextSeatSlot('athena'))
  })
})

describe('the DLQ pile', () => {
  const pile = (count: number) => {
    const seating = createSeating()
    let layout: SeatedFile[] = []
    for (let i = 0; i < count; i++) layout = seating.addToDlq(`f${i}`)
    return layout
  }

  it('gives every arrival its own place in the pile', () => {
    const layout = pile(3)

    expect(layout.map((f) => f.id)).toEqual(['f0', 'f1', 'f2'])
    expect(new Set(layout.map((f) => `${f.seat.x},${f.seat.y}`)).size).toBe(3)
  })

  it('fills the bin bottom row first, since a backlog piles up', () => {
    const layout = pile(8)
    const firstRow = layout.slice(0, DLQ_COLUMNS)
    const secondRow = layout.slice(DLQ_COLUMNS)

    expect(new Set(firstRow.map((f) => f.seat.y)).size).toBe(1)
    expect(secondRow[0]!.seat.y).toBeLessThan(firstRow[0]!.seat.y)
  })

  it('keeps each seat in a row distinct', () => {
    const row = pile(DLQ_COLUMNS).map((f) => f.seat.x)

    expect(new Set(row).size).toBe(DLQ_COLUMNS)
  })

  /* The pile has no cap, because the point of the diagram is that a real
     backlog accumulates for as long as nobody redrives it. So the drawing
     has to stay honest at any depth rather than running out of seats: at
     twelve the rows sat 16 apart and the thirteenth file was placed exactly
     on top of the first, which happened about two minutes into a visit. */
  it('leaves the geometry alone while the pile still fits the bin', () => {
    expect(pile(DLQ_ROWS_BEFORE_PACKING * DLQ_COLUMNS)).toEqual(
      pile(DLQ_ROWS_BEFORE_PACKING * DLQ_COLUMNS),
    )
    const rows = new Set(
      pile(DLQ_ROWS_BEFORE_PACKING * DLQ_COLUMNS).map((f) => f.seat.y),
    )
    expect(rows.size).toBe(DLQ_ROWS_BEFORE_PACKING)
  })

  it('packs the rows closer rather than reusing a seat once the bin is full', () => {
    const full = pile(DLQ_ROWS_BEFORE_PACKING * DLQ_COLUMNS)
    const overfull = pile(DLQ_ROWS_BEFORE_PACKING * DLQ_COLUMNS * 2)

    expect(new Set(overfull.map((f) => `${f.seat.x},${f.seat.y}`)).size).toBe(
      overfull.length,
    )
    // Still inside the bin it is drawn in, just denser.
    const extent = (layout: SeatedFile[]) =>
      Math.max(...layout.map((f) => f.seat.y)) -
      Math.min(...layout.map((f) => f.seat.y))
    expect(extent(overfull)).toBeCloseTo(extent(full))
  })

  it('re-seats the whole pile on each arrival, so nothing is left behind', () => {
    const seating = createSeating()
    for (let i = 0; i < DLQ_ROWS_BEFORE_PACKING * DLQ_COLUMNS; i++) {
      seating.addToDlq(`f${i}`)
    }
    const beforeOverflow = seating.addToDlq('tipping-point')

    expect(beforeOverflow).toHaveLength(
      DLQ_ROWS_BEFORE_PACKING * DLQ_COLUMNS + 1,
    )
    // Every file, not only the new one: the rows just moved under them.
    expect(beforeOverflow.map((f) => f.id)).toContain('f0')
  })

  /* The failure this replaces was reachable by reading the case study for
     two minutes, so the property is checked over a pile far deeper than a
     visit produces rather than at one or two sample depths. */
  it('never seats two files in the same place, at any depth', () => {
    const seating = createSeating()
    for (let count = 1; count <= 200; count++) {
      const layout = seating.addToDlq(`f${count}`)
      const seats = new Set(layout.map((f) => `${f.seat.x},${f.seat.y}`))

      expect(seats.size, `${count} files in the pile`).toBe(count)
      // And it stays in the bin rather than climbing out of the artwork.
      for (const { seat } of layout) {
        expect(Math.abs(seat.y)).toBeLessThanOrEqual(16)
      }
    }
  })

  it('closes the pile back up when a redrive takes a file out', () => {
    const seating = createSeating()
    for (const id of ['a', 'b', 'c']) seating.addToDlq(id)

    expect(seating.removeFromDlq('b')!.map((f) => f.id)).toEqual(['a', 'c'])
    expect(seating.dlqDepth()).toBe(2)
  })

  it('reports nothing moved for a file that was never in the DLQ', () => {
    const seating = createSeating()
    seating.addToDlq('a')

    expect(seating.removeFromDlq('elsewhere')).toBeNull()
    expect(seating.dlqDepth()).toBe(1)
  })

  it('does not pile the same file up twice', () => {
    const seating = createSeating()
    seating.addToDlq('a')

    expect(seating.addToDlq('a')).toHaveLength(1)
  })
})

describe('createSeating', () => {
  it('gives each mount its own state', () => {
    const a = createSeating()
    const b = createSeating()
    a.enqueueSqs('x')

    expect(b.sqsDepth()).toBe(0)
  })
})
