import { describe, expect, it } from 'vitest'
import {
  ATHENA_CAPACITY,
  SQS_VISIBLE_SLOTS,
  sqsQueueSeat,
} from './pipelineData'
import { createSeating } from './pipelineSeating'

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
  it('grows across arrivals instead of cycling through fixed seats', () => {
    const seating = createSeating()
    const first = seating.nextDlqSeat()

    expect(seating.nextDlqSeat()).not.toEqual(first)
  })

  it('fills the bin bottom row first, since a backlog piles up', () => {
    const seating = createSeating()
    const firstRow = [0, 1, 2, 3].map(() => seating.nextDlqSeat())
    const secondRow = [0, 1, 2, 3].map(() => seating.nextDlqSeat())

    expect(new Set(firstRow.map((s) => s.y)).size).toBe(1)
    expect(secondRow[0]!.y).toBeLessThan(firstRow[0]!.y)
  })

  it('keeps each seat in a row distinct', () => {
    const seating = createSeating()
    const row = [0, 1, 2, 3].map(() => seating.nextDlqSeat().x)

    expect(new Set(row).size).toBe(4)
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
