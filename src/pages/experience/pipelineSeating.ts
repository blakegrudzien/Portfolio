import { ATHENA_CAPACITY, sqsQueueSeat, type NodeId } from './pipelineData'

export interface Seat {
  x: number
  y: number
}

export interface SeatedFile {
  id: string
  seat: Seat
}

/** Where the nth file in the DLQ's bin sits. Exported so the static
 * reduced-motion scene can lay out a pile using the same rule the live
 * one does, rather than a second set of coordinates that would drift. */
export function dlqClusterOffset(slot: number): Seat {
  const col = slot % 4
  const row = Math.floor(slot / 4) % 3
  // Rows land on the centers of the bin's three compartments rather than
  // on the lines dividing them, and fill from the bottom up. A backlog
  // piles up, it doesn't hang from the ceiling.
  return { x: (col - 1.5) * 13, y: 16 - row * 16 }
}

/** Which file is sitting where in the diagram, and what happens to the
 * others when one arrives or leaves.
 *
 * Split out of usePipelineAnimation because none of it needs the DOM or
 * React: it is a queue, a bounded working set, and two counters. The hook
 * carried this as four separate refs mutated in place, which left the
 * rules that actually matter (the front of the queue is the end nearest
 * the exit, Athena evicts oldest first, the DLQ pile grows rather than
 * cycling) impossible to check without rendering an SVG and watching it.
 *
 * Every method returns what changed. Writing that to the screen stays in
 * the hook, which is the only part that needs an element.
 */
export function createSeating() {
  const sqsQueue: string[] = []
  const athenaParked: string[] = []
  const seatCounters = new Map<NodeId, number>()
  let dlqSlot = 0

  function sqsLayout(): SeatedFile[] {
    return sqsQueue.map((id, index) => ({ id, seat: sqsQueueSeat(index) }))
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

    /** The next spot in the DLQ's bin. The pile has to keep growing across
     * arrivals instead of cycling through fixed seats, which is why this
     * counter lives here rather than in pipelineData's seat table. */
    nextDlqSeat(): Seat {
      return dlqClusterOffset(dlqSlot++)
    },
  }
}

export type Seating = ReturnType<typeof createSeating>
