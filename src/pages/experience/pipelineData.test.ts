import { describe, expect, it } from 'vitest'
import {
  ATHENA_CAPACITY,
  NODES,
  SEGMENTS,
  SEGMENT_DURATIONS_MS,
  SQS_VISIBLE_SLOTS,
  STATIC_EDGES,
  getNode,
  nodeSeat,
  pipelineStatus,
  sqsQueueSeat,
  type NodeId,
  type SegmentKey,
} from './pipelineData'

interface Point {
  x: number
  y: number
}

/** Reads back a published "M x,y L x,y" path. Every geometry assertion
 * below works from the strings the diagram actually renders rather than
 * from the private helpers that build them, so the tests stay honest if
 * that derivation is rewritten. */
function parsePath(d: string): Point[] {
  return d.split(/\s*[ML]\s*/).flatMap((pair) => {
    const [x, y] = pair.split(',').map(Number)
    return x === undefined || y === undefined || Number.isNaN(x)
      ? []
      : [{ x, y }]
  })
}

function pathLength(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1]!
    const to = points[i]!
    total += Math.hypot(to.x - from.x, to.y - from.y)
  }
  return total
}

function nearestNode(point: Point): NodeId {
  return NODES.reduce((best, node) =>
    Math.hypot(point.x - node.x, point.y - node.y) <
    Math.hypot(point.x - best.x, point.y - best.y)
      ? node
      : best,
  ).id
}

/** The drawn (trimmed) edge running between two nodes, located by which
 * pair of node centres its two ends sit closest to rather than by its
 * index in STATIC_EDGES, so reordering the connection table doesn't
 * silently retarget a test. */
function drawnEdge(from: NodeId, to: NodeId): Point[] {
  const start = getNode(from)
  const end = getNode(to)
  const scored = STATIC_EDGES.map((edge) => parsePath(edge.d)).map(
    (points) => ({
      points,
      cost:
        Math.hypot(points[0]!.x - start.x, points[0]!.y - start.y) +
        Math.hypot(points.at(-1)!.x - end.x, points.at(-1)!.y - end.y),
    }),
  )
  const best = scored.reduce((a, b) => (b.cost < a.cost ? b : a))
  return best.points
}

const SEGMENT_KEYS = Object.keys(SEGMENTS) as SegmentKey[]

describe('getNode', () => {
  it('returns the node with the given id', () => {
    expect(getNode('sqs')).toMatchObject({ id: 'sqs', x: 468, y: 352 })
  })

  it('throws rather than returning undefined for an id with no node', () => {
    expect(() => getNode('nope' as NodeId)).toThrow(/Unknown node id: nope/)
  })
})

describe('NODES', () => {
  it('defines each node exactly once', () => {
    const ids = NODES.map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every node a positive hit target', () => {
    for (const node of NODES) {
      expect(node.width).toBeGreaterThan(0)
      expect(node.height).toBeGreaterThan(0)
      expect(node.lines.length).toBeGreaterThan(0)
    }
  })
})

describe('token paths', () => {
  it('runs every segment centre to centre, since arriving at a node means arriving in it', () => {
    for (const key of SEGMENT_KEYS) {
      const points = parsePath(SEGMENTS[key])
      const start = points[0]!
      const end = points[points.length - 1]!
      const startNode = getNode(nearestNode(start))
      const endNode = getNode(nearestNode(end))
      expect({ x: start.x, y: start.y }).toEqual({
        x: startNode.x,
        y: startNode.y,
      })
      expect({ x: end.x, y: end.y }).toEqual({ x: endNode.x, y: endNode.y })
    }
  })

  it('detours the redrive return below every node it passes under', () => {
    const points = parsePath(SEGMENTS.dlqReturn)
    const lowest = Math.max(...points.map((p) => p.y))
    expect(points.length).toBeGreaterThan(2)
    expect(lowest).toBeGreaterThan(getNode('dlq').y)
    expect(lowest).toBeGreaterThan(getNode('sqs').y)
  })
})

describe('drawn edges', () => {
  it('draws one edge per connection, including the one no token travels', () => {
    expect(STATIC_EDGES.length).toBe(SEGMENT_KEYS.length + 1)
    expect(() => drawnEdge('dlq', 'slack')).not.toThrow()
  })

  it('never puts a point inside any node artwork, so no line runs under a drawing', () => {
    for (const edge of STATIC_EDGES) {
      for (const point of parsePath(edge.d)) {
        for (const node of NODES) {
          const inside =
            Math.abs(point.x - node.x) < node.width / 2 &&
            Math.abs(point.y - node.y) < node.height / 2
          expect({ node: node.id, point, inside }).toMatchObject({
            inside: false,
          })
        }
      }
    }
  })

  // The first version of this layout trimmed edges to the artwork only, so
  // a downward edge left the box and drew straight through the node's
  // caption. Clearance below a node has to account for its label.

  it('leaves more room below a two-line label than a one-line one', () => {
    const device = getNode('device')
    const condenser = getNode('condenser')
    expect(device.lines.length).toBe(1)
    expect(condenser.lines.length).toBe(2)

    const oneLine =
      drawnEdge('device', 'condenser')[0]!.y - device.y - device.height / 2
    const twoLine =
      drawnEdge('condenser', 'kinesis')[0]!.y -
      condenser.y -
      condenser.height / 2
    expect(twoLine).toBeGreaterThan(oneLine)
  })

  it('leaves more room below a node than above it, since the label sits below', () => {
    const condenser = getNode('condenser')
    const above = condenser.y - drawnEdge('device', 'condenser').at(-1)!.y
    const below = drawnEdge('condenser', 'kinesis')[0]!.y - condenser.y
    expect(below).toBeGreaterThan(above)
  })
})

describe('SEGMENT_DURATIONS_MS', () => {
  it('moves every file at one speed, so a long hop takes proportionally longer', () => {
    const ratios = SEGMENT_KEYS.map(
      (key) => SEGMENT_DURATIONS_MS[key] / pathLength(parsePath(SEGMENTS[key])),
    )
    for (const ratio of ratios) {
      expect(ratio).toBeCloseTo(ratios[0]!, 2)
    }
  })

  it('gives every segment a positive duration', () => {
    for (const key of SEGMENT_KEYS) {
      expect(SEGMENT_DURATIONS_MS[key]).toBeGreaterThan(0)
    }
  })

  it('takes longest on the redrive return, the longest path in the diagram', () => {
    const longest = SEGMENT_KEYS.reduce((best, key) =>
      SEGMENT_DURATIONS_MS[key] > SEGMENT_DURATIONS_MS[best] ? key : best,
    )
    expect(longest).toBe('dlqReturn')
  })
})

describe('sqsQueueSeat', () => {
  it('seats the front of the queue nearest the exit', () => {
    for (let i = 1; i < SQS_VISIBLE_SLOTS; i++) {
      expect(sqsQueueSeat(i).x).toBeLessThan(sqsQueueSeat(i - 1).x)
    }
  })

  it('shares the back slot once the channel is full rather than spilling out of it', () => {
    const last = sqsQueueSeat(SQS_VISIBLE_SLOTS - 1)
    expect(sqsQueueSeat(SQS_VISIBLE_SLOTS)).toEqual(last)
    expect(sqsQueueSeat(99)).toEqual(last)
  })

  it('keeps the queue on one row', () => {
    for (let i = 0; i < 8; i++) {
      expect(sqsQueueSeat(i).y).toBe(0)
    }
  })
})

describe('nodeSeat', () => {
  it('gives Athena one distinct seat per cell of its grid', () => {
    const seats = Array.from({ length: ATHENA_CAPACITY }, (_, slot) =>
      JSON.stringify(nodeSeat('athena', slot)),
    )
    expect(new Set(seats).size).toBe(ATHENA_CAPACITY)
  })

  it('wraps past the last seat instead of running off the end', () => {
    expect(nodeSeat('athena', ATHENA_CAPACITY)).toEqual(nodeSeat('athena', 0))
    expect(nodeSeat('s3lake', 3)).toEqual(nodeSeat('s3lake', 0))
  })

  // The DLQ pile has to keep growing across arrivals rather than cycling
  // through fixed seats, so usePipelineAnimation places it instead.
  it('returns null for nodes that place their own arrivals', () => {
    expect(nodeSeat('dlq', 0)).toBeNull()
    expect(nodeSeat('device', 0)).toBeNull()
  })
})

describe('pipelineStatus', () => {
  it('reports a healthy pipeline when nothing is held', () => {
    expect(pipelineStatus(0, false)).toBe(
      'Telemetry is flowing through the pipeline. Nothing is backed up.',
    )
  })

  it('agrees in number for a single held file', () => {
    expect(pipelineStatus(1, false)).toContain(
      '1 file failed to parse and is held',
    )
  })

  it('agrees in number for several held files', () => {
    expect(pipelineStatus(3, false)).toContain(
      '3 files failed to parse and are held',
    )
  })

  it('describes the redrive in progress whatever the backlog', () => {
    const redriving = 'Redriving the backlog through SQS to the parser.'
    expect(pipelineStatus(0, true)).toBe(redriving)
    expect(pipelineStatus(5, true)).toBe(redriving)
  })
})
