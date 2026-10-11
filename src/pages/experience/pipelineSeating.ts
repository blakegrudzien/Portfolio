import { ATHENA_CAPACITY, sqsQueueSeat, type NodeId } from './pipelineData'

export interface Seat {
  x: number
  y: number
}

export interface SeatedFile {
  id: string
  seat: Seat
}

export const DLQ_COLUMNS = 4
/** Rows the bin holds at its natural spacing, one per drawn compartment. */
export const DLQ_ROWS_BEFORE_PACKING = 3

const DLQ_COLUMN_PITCH = 13
const DLQ_ROW_PITCH = 16
/** The bottom row, which is where a pile starts. */
const DLQ_FLOOR_Y = 16

/** Where the nth of `total` files in the DLQ's bin sits. Exported so the
 * static reduced-motion scene can lay out a pile using the same rule the
 * live one does, rather than a second set of coordinates that would drift.
 *
 * Nothing caps the pile, because the argument the diagram is making is that
 * a real backlog accumulates for as long as nobody redrives it. So the
 * drawing has to stay truthful at any depth instead of running out of
 * seats. It used to wrap at twelve, which put the thirteenth file exactly
 * on top of the first and left the Slack badge counting files that were no
 * longer visible, about two minutes into a visit.
 *
 * Rows past the third are fitted by shrinking the spacing between every
 * row rather than by growing upward, so the pile stays inside the bin it is
 * drawn in and the bin keeps meaning what it looks like. Up to twelve files
 * the geometry is unchanged: rows land on the centers of the three drawn
 * compartments and fill from the bottom, since a backlog piles up rather
 * than hanging from the ceiling.
 */
export function dlqClusterOffset(slot: number, total = 1): Seat {
  const rows = Math.max(DLQ_ROWS_BEFORE_PACKING, Math.ceil(total / DLQ_COLUMNS))
  // Pitch that keeps `rows` rows spanning the same height three rows span
  // at DLQ_ROW_PITCH. rows is at least 3, so this never divides by zero.
  const pitch = (DLQ_ROW_PITCH * (DLQ_ROWS_BEFORE_PACKING - 1)) / (rows - 1)
  const col = slot % DLQ_COLUMNS
  const row = Math.floor(slot / DLQ_COLUMNS)
  return {
    x: (col - (DLQ_COLUMNS - 1) / 2) * DLQ_COLUMN_PITCH,
    y: DLQ_FLOOR_Y - row * pitch,
  }
}

/** Which file is sitting where in the diagram, and what happens to the
 * others when one arrives or leaves.
 *
 * Split out of usePipelineAnimation because none of it needs the DOM or
 * React: it is a queue, a bounded working set, an unbounded pile, and a
 * counter. The hook carried this as four separate refs mutated in place,
 * which left the rules that actually matter (the front of the queue is the
 * end nearest the exit, Athena evicts oldest first, the DLQ pile packs
 * rather than reusing a seat) impossible to check without rendering an SVG
 * and watching it for two minutes.
 *
 * Every method returns what changed. Writing that to the screen stays in
 * the hook, which is the only part that needs an element.
 */
export function createSeating() {
  const sqsQueue: string[] = []
  const athenaParked: string[] = []
  const dlqPile: string[] = []
  const seatCounters = new Map<NodeId, number>()

  function sqsLayout(): SeatedFile[] {
    return sqsQueue.map((id, index) => ({ id, seat: sqsQueueSeat(index) }))
  }

  function dlqLayout(): SeatedFile[] {
    return dlqPile.map((id, index) => ({
      id,
      seat: dlqClusterOffset(index, dlqPile.length),
    }))
  }

  return {
    /** Adds a file to the back of the queue and returns the queue's new
     * layout. Idempotent, since a file can reach SQS more than once. */
    enqueueSqs(id: string): SeatedFile[] {
      if (!sqsQueue.includes(id)) sqsQueue.push(id)
      return sqsLayout()
    },

    /** Takes a file out of the queue and returns the new layout, so
     * everything behind it slides forward into the gap rather than the
     * gap simply appearing. Null when the file was not queued, which
     * means nothing moved and there is nothing to redraw. */
    dequeueSqs(id: string): SeatedFile[] | null {
      const index = sqsQueue.indexOf(id)
      if (index === -1) return null
      sqsQueue.splice(index, 1)
      return sqsLayout()
    },

    /** How many files are waiting in SQS. */
    sqsDepth(): number {
      return sqsQueue.length
    },

    /** Rotates through a node's seats so two files stopped at the same
     * node don't land on top of each other. Deliberately not real
     * occupancy tracking: a wrong guess here costs a slight overlap, and
     * the bookkeeping to do better would outweigh that. */
    nextSeatSlot(nodeId: NodeId): number {
      const next = (seatCounters.get(nodeId) ?? 0) + 1
      seatCounters.set(nodeId, next)
      return next
    },

    /** Keeps a finished record in Athena's grid instead of deleting it,
     * returning the ids evicted to make room. Seats are handed out in
     * order and wrap at the same capacity, so the cell freed by an
     * eviction is exactly the one the new arrival is about to take. */
    parkAtAthena(id: string): string[] {
      athenaParked.push(id)
      const evicted: string[] = []
      while (athenaParked.length > ATHENA_CAPACITY) {
        const oldest = athenaParked.shift()
        if (oldest !== undefined) evicted.push(oldest)
      }
      return evicted
    },

    /** Adds a file to the DLQ's bin and returns the pile's new layout.
     * Every file, not just the arrival: the rows pack closer as the pile
     * deepens, so the ones already in the bin move too. Idempotent, since a
     * redriven file can fail again and come back. */
    addToDlq(id: string): SeatedFile[] {
      if (!dlqPile.includes(id)) dlqPile.push(id)
      return dlqLayout()
    },

    /** Takes a file out of the bin and returns the new layout, so the pile
     * closes back up behind it. Null when the file was not in the DLQ,
     * which means nothing moved and there is nothing to redraw. */
    removeFromDlq(id: string): SeatedFile[] | null {
      const index = dlqPile.indexOf(id)
      if (index === -1) return null
      dlqPile.splice(index, 1)
      return dlqLayout()
    },

    /** How many files are held in the DLQ. */
    dlqDepth(): number {
      return dlqPile.length
    },
  }
}

export type Seating = ReturnType<typeof createSeating>
