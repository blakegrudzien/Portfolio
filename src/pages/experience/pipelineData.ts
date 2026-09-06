// Every node id in the diagram, as a closed union rather than a bare
// `string`, so a typo'd id (e.g. in a SequenceStep's `arrival`) becomes a
// compile error instead of a silent no-op where nothing ever highlights.
export type NodeId =
  | 'device'
  | 'condenser'
  | 'kinesis'
  | 's3lake'
  | 'sqs'
  | 'lambda'
  | 'parser'
  | 'output'
  | 'athena'
  | 'dlq'
  | 'slack'

export interface DiagramNode {
  id: NodeId
  lines: string[]
  x: number
  y: number
  /** The node's hit target and label anchor, centered on (x, y). Nodes are
   * no longer uniform boxes, since each one is a bespoke illustration
   * (see pipelineGlyphs), so size is per node rather than two shared
   * constants. Edge trimming below derives from this too, which is what
   * keeps the line art from running underneath the artwork. */
  width: number
  height: number
}

// Positions are hand-placed, but only here: every edge path, every token
// path and every hit target is derived from them further down. Moving a
// node is a one-line change.
export const NODES: DiagramNode[] = [
  { id: 'device', lines: ['Devices'], x: 108, y: 50, width: 132, height: 60 },
  {
    id: 'condenser',
    lines: ['Telemetry', 'condenser'],
    x: 108,
    y: 214,
    width: 116,
    height: 52,
  },
  {
    id: 'kinesis',
    lines: ['Kinesis', 'Firehose'],
    x: 108,
    y: 352,
    width: 108,
    height: 60,
  },
  {
    id: 's3lake',
    lines: ['S3 data lake'],
    x: 296,
    y: 352,
    width: 128,
    height: 76,
  },
  { id: 'sqs', lines: ['SQS'], x: 468, y: 352, width: 112, height: 60 },
  { id: 'lambda', lines: ['Lambda'], x: 616, y: 352, width: 108, height: 60 },
  {
    id: 'parser',
    lines: ['The parser'],
    x: 764,
    y: 352,
    width: 112,
    height: 60,
  },
  {
    id: 'output',
    lines: ['Parquet output'],
    x: 936,
    y: 180,
    width: 108,
    height: 64,
  },
  { id: 'athena', lines: ['Athena'], x: 1084, y: 180, width: 112, height: 72 },
  { id: 'dlq', lines: ['DLQ'], x: 936, y: 456, width: 100, height: 68 },
  { id: 'slack', lines: ['Slack'], x: 1084, y: 456, width: 92, height: 56 },
]

export function getNode(id: NodeId): DiagramNode {
  const node = NODES.find((n) => n.id === id)
  if (!node) throw new Error(`Unknown node id: ${id}`)
  return node
}

// Context (always) and the real tradeoff reasoning (where one exists) per
// node. This is where the actual engineering judgment lives, not in a
// separate prose block disconnected from the diagram. Nodes without a
// documented decision only get context; not every step was a deliberate
// choice worth defending. A Record keyed by the closed NodeId union (not
// Record<string, ...>) makes this exhaustive: every node is guaranteed an
// entry, checked by the compiler rather than by remembering to fill one in.
export const NODE_INFO: Record<
  NodeId,
  {
    context: string
    tradeoff?: string
    /** What the payload actually looks like at this stop. This used to be
     * a live panel beside the diagram, driven by a file the visitor sent
     * through by hand. It changed state every few hundred milliseconds,
     * which is faster than anyone can read a JSON body, so it moved
     * here, where it's read at the reader's own pace and sits next to the
     * reasoning for the same stop.
     *
     * Every value is invented. The real object keys, bucket names and
     * service names from this pipeline are not in this repository and are
     * not going into it; these are shaped like the real thing and are not
     * it. Lines stay short, since this renders as mono in a narrow column. */
    payload?: { label: string; lines: string[] }
  }
> = {
  device: {
    context:
      "Level Home's smart locks, and video doorbells emit telemetry as they operate.",
    payload: {
      label: 'Separate readings',
      lines: [
        '4F 2A 9C 01 3E 88 D2 00',
        '71 4B FF 02 1A 90 C3 5D',
        '0A 55 E1 07 6D 3F B8 21',
        '9E 30 7A 04 C2 15 46 FF',
      ],
    },
  },
  condenser: {
    context: 'Pre-processes and batches device events before they move on.',
    payload: {
      label: 'Batched into one file',
      lines: ['{', '  "records": [ …4 ]', '}'],
    },
  },
  kinesis: {
    context:
      'Streams the batched telemetry into the data lake, gzipped. From here until Lambda fetches it back, nothing in the pipeline looks inside the file.',
    payload: {
      label: 'Compressed',
      lines: ['telemetry-174791.json.gz', '1.4 KB → 412 B'],
    },
  },
  s3lake: {
    context: 'Every raw file lands here first, before anything gets parsed.',
    payload: {
      label: 'Written to the lake',
      lines: ['s3://data-lake/', 'telemetry-174791.json.gz'],
    },
  },
  sqs: {
    context:
      'An event notification queues up here the moment a new file lands. The queue holds a pointer, bucket and key, not the payload; Lambda fetches the object itself.',
    tradeoff:
      "Chosen over EventBridge: EventBridge's main advantage is fanning out to multiple destinations, which didn't matter here (there's only one pathway). SQS came with a native DLQ and simple retry mechanics out of the box, and was cheaper.",
    payload: {
      label: 'Event notification',
      lines: ['{', '  "bucket": "data-lake",', '  "key": "…json.gz"', '}'],
    },
  },
  lambda: {
    context: 'Picks up the queued file and hands it to the parser.',
    tradeoff:
      'Both success and failure route through this same function, one central place to check either outcome, and it separates parsing logic and placement logic.',
    payload: {
      label: 'Fetched and extracted',
      lines: ['get → gunzip → raw hex', '4F2A9C013E88D200714BFF…'],
    },
  },
  parser: {
    context:
      'Legacy code written in Rust, decodes the raw device bytes into a structured record. Firmware-team owned. This project treats it as a pluggable step, not something its own code needs to understand internally.',
    payload: {
      label: 'Decoded records',
      lines: [
        '{"event": "battery",',
        ' "source": "lock-04af",',
        ' "battery": "62%"}',
      ],
    },
  },
  output: {
    context: 'Successfully parsed records get converted and written here.',
    tradeoff:
      'Uses Apache Arrow to write Parquet. Originally used DuckDB, but it required CGo=1, which meant adjusting other parts of the project to accommodate it, Arrow worked without that constraint.',
    payload: {
      label: 'Converted to Parquet',
      lines: ['telemetry-174791.parquet', '4 rows · columnar (Arrow)'],
    },
  },
  athena: {
    context:
      'Queries run directly against the Parquet files here, no separate database to keep in sync.',
    payload: {
      label: 'Queryable in place',
      lines: ['SELECT battery, source', 'FROM telemetry …'],
    },
  },
  dlq: {
    context:
      "Failed files land here instead of being deleted. Redriving doesn't repair a file the parser gets adjusted to work for the new telemetry, and the same bytes then parse.",
    tradeoff:
      "Uses the plain SQS dead-letter queue rather than a custom one. A custom DLQ could retry only genuine AWS/connectivity errors and give up immediately on unrecoverable parsing errors, the native one can't tell the difference. Traded that precision for needing zero custom code and being able to reprocess the whole queue with one command.",
    payload: {
      label: 'Parse error',
      lines: ['⚠ unrecognized event', '  type 0x9E'],
    },
  },
  slack: {
    context: 'Notifies the firmware team when a file fails.',
    tradeoff:
      'Started as a real-time alert bot, but switched to a daily digest instead after talks with the firmware team.',
    payload: {
      label: 'Daily digest',
      lines: ['3 files failed to parse', 'in the last 24h'],
    },
  },
}

// Overlapping bounding regions grouping nodes by role, matching the shape
// of the original hand-drawn sketch, which used blue/red/green. This
// stays inside the site's locked bg/ink/accent palette instead, so the
// three are told apart by border style (solid/dashed/dotted) and label
// text rather than by introducing new hues. Hand-fit bounding boxes, not
// derived from NODES. Unlike the edges below, a region has to wrap
// several nodes plus their labels plus padding, which isn't a clean
// offset from any single node's coordinates.
export const REGIONS: {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  dash?: string
  labelX: number
  labelY: number
}[] = [
  {
    id: 'data-prep',
    label: 'Data preparation',
    x: 214,
    y: 300,
    width: 622,
    height: 115,
    labelX: 230,
    labelY: 320,
  },
  {
    id: 'failure',
    label: 'Failure pathway',
    x: 396,
    y: 300,
    width: 750,
    height: 256,
    dash: '10 6',
    labelX: 412,
    labelY: 320,
  },
  {
    id: 'success',
    label: 'Success pathway',
    x: 694,
    y: 124,
    width: 460,
    height: 291,
    dash: '2 4',
    labelX: 876,
    labelY: 144,
  },
]

// --- geometry ------------------------------------------------------------

interface Point {
  x: number
  y: number
}

/** Gap left between a node's box and the line art that meets it, so edges
 * stop just short of the artwork instead of touching or tucking under it. */
const EDGE_GAP = 10

/** A node's label sits below its artwork, so its ink reaches further down
 * than its box does. Edges have to clear the label too, or else a
 * vertical edge draws straight through the text, which is exactly what
 * the first pass of this layout did. */
const LABEL_BASELINE_OFFSET = 15
const LABEL_LINE_HEIGHT = 15
const LABEL_DESCENT = 5

function bottomExtent(node: DiagramNode): number {
  return (
    node.height / 2 +
    LABEL_BASELINE_OFFSET +
    (node.lines.length - 1) * LABEL_LINE_HEIGHT +
    LABEL_DESCENT
  )
}

/** Where a ray from a node's center toward `toward` crosses that node's
 * bounds. Used to trim edges back to the node boundary. The diagonal
 * parser → output / parser → DLQ edges are why this solves for the box
 * rather than just subtracting half a width. */
function boxExit(node: DiagramNode, toward: Point): Point {
  const dx = toward.x - node.x
  const dy = toward.y - node.y
  const halfW = node.width / 2 + EDGE_GAP
  // Asymmetric on purpose: only the downward direction has a label in it.
  const extentY = (dy > 0 ? bottomExtent(node) : node.height / 2) + EDGE_GAP
  const scaleX = dx === 0 ? Infinity : halfW / Math.abs(dx)
  const scaleY = dy === 0 ? Infinity : extentY / Math.abs(dy)
  const scale = Math.min(scaleX, scaleY)
  return { x: node.x + dx * scale, y: node.y + dy * scale }
}

function polyline(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')
}

/** Where a token comes to rest inside a node's artwork, as an offset from
 * that node's center. Arriving somewhere should mean landing *in* the
 * thing, on the floor of the lake, in a slot of the queue, in a cell of
 * Athena's grid, rather than stopping on top of a picture of it. That's
 * the whole reason the nodes stopped being rectangles, and it's what the
 * per-stop particle effects used to gesture at from the outside.
 *
 * Several seats per node so two tokens at the same stop don't stack. The
 * DLQ is deliberately absent: its pile has to keep growing across
 * arrivals instead of cycling, so usePipelineAnimation owns that one.
 */
const NODE_SEATS: Partial<Record<NodeId, Point[]>> = {
  condenser: [{ x: 0, y: 0 }],
  kinesis: [{ x: 6, y: 0 }],
  s3lake: [
    { x: -30, y: 22 },
    { x: 0, y: 22 },
    { x: 30, y: 22 },
  ],
  // Clear of the lambda mark, which sits left of the node's centre.
  lambda: [{ x: 26, y: 2 }],
  parser: [{ x: 0, y: 0 }],
  output: [
    { x: -20, y: 16 },
    { x: 0, y: 16 },
    { x: 20, y: 16 },
  ],
  // The grid cells themselves, filling bottom row first so the working set
  // reads as stacking up rather than scattering.
  athena: [18, 0, -18].flatMap((y) =>
    [-36, -12, 12, 36].map((x) => ({ x, y })),
  ),
}

/** Where the nth file in the SQS queue sits. Position is queue position,
 * not an arbitrary free slot: the front of the queue, the one Lambda
 * takes next, is nearest the exit, and everything behind it shuffles
 * forward when it leaves. That's the behaviour that makes it read as a
 * queue rather than as four parking spaces. Beyond the fourth, arrivals
 * share the back slot rather than spilling out of the channel. */
export const SQS_VISIBLE_SLOTS = 4

export function sqsQueueSeat(index: number): Point {
  return { x: 33 - 22 * Math.min(index, SQS_VISIBLE_SLOTS - 1), y: 0 }
}

/** Cells in Athena's grid, and therefore how many finished records it
 * can hold before the oldest is dropped to make room. */
export const ATHENA_CAPACITY = 12

export function nodeSeat(id: NodeId, slot: number): Point | null {
  const seats = NODE_SEATS[id]
  if (!seats) return null
  return seats[slot % seats.length] ?? null
}

export type SegmentKey =
  | 'devCond'
  | 'condKin'
  | 'kinS3'
  | 's3Sqs'
  | 'sqsLambda'
  | 'lambdaParser'
  | 'parserOutput'
  | 'outputAthena'
  | 'parserDlq'
  | 'dlqReturn'

interface Connection {
  from: NodeId
  to: NodeId
  /** Omitted for edges no token ever travels: DLQ → Slack is a
   * notification about a file, not the file moving anywhere. */
  segment?: SegmentKey
  /** Interior corners, for edges that don't run straight between two
   * nodes. Only the redrive return needs them, since it detours below the
   * whole diagram rather than cutting back across the main row. */
  waypoints?: Point[]
  dashed?: boolean
}

// The single source of truth for how the diagram is wired. Edge line art
// and token travel paths used to be two hand-written lists of coordinate
// strings that had to be kept identical by hand; they're now both derived
// from this, so they cannot drift apart. They differ in exactly one way,
// and it's computed: an edge stops at the node's boundary, a token
// travels all the way to its center.
const CONNECTIONS: Connection[] = [
  { from: 'device', to: 'condenser', segment: 'devCond' },
  { from: 'condenser', to: 'kinesis', segment: 'condKin' },
  { from: 'kinesis', to: 's3lake', segment: 'kinS3' },
  { from: 's3lake', to: 'sqs', segment: 's3Sqs' },
  { from: 'sqs', to: 'lambda', segment: 'sqsLambda' },
  { from: 'lambda', to: 'parser', segment: 'lambdaParser' },
  { from: 'parser', to: 'output', segment: 'parserOutput' },
  { from: 'output', to: 'athena', segment: 'outputAthena' },
  { from: 'parser', to: 'dlq', segment: 'parserDlq' },
  { from: 'dlq', to: 'slack' },
  {
    from: 'dlq',
    to: 'sqs',
    segment: 'dlqReturn',
    waypoints: [
      { x: 936, y: 538 },
      { x: 468, y: 538 },
    ],
    dashed: true,
  },
]

function connectionPoints(connection: Connection) {
  const from = getNode(connection.from)
  const to = getNode(connection.to)
  const waypoints = connection.waypoints ?? []
  const firstAfterStart = waypoints[0] ?? to
  const lastBeforeEnd = waypoints[waypoints.length - 1] ?? from
  return {
    /** Center to center, where a token actually travels, since arriving
     * "at" a node means arriving at its middle. */
    full: [from, ...waypoints, to],
    /** Trimmed to the node boundaries, which is what gets drawn. */
    trimmed: [
      boxExit(from, firstAfterStart),
      ...waypoints,
      boxExit(to, lastBeforeEnd),
    ],
  }
}

// Background line art: every edge in the diagram, drawn once and never
// animated.
export const STATIC_EDGES: { d: string; dashed?: boolean }[] = CONNECTIONS.map(
  (connection) => ({
    d: polyline(connectionPoints(connection).trimmed),
    dashed: connection.dashed,
  }),
)

// One path per node-to-node hop, deliberately finer-grained than the
// diagram's visual "legs", because a flow's arrivedAt (and every per-stop
// effect keyed off it) only updates at a segment's end. A single
// device-to-parser transition would never pass through an intermediate
// "arrived at Kinesis" state to hang an effect on.
/** One speed for the whole diagram, rather than one duration.
 *
 * Every hop used to take the same 450ms whatever its length, so a file
 * crossed a 243px diagonal half again as fast as a 148px straight, and the
 * redrive return covered 736px in the same time, about 1600px a second,
 * which is not travel, it's a cut. A single speed makes the pipeline read
 * as one continuous thing a file moves through at a steady pace. */
const TRAVEL_SPEED_PX_PER_SECOND = 200

function polylineLength(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1]
    const to = points[i]
    if (!from || !to) continue
    total += Math.hypot(to.x - from.x, to.y - from.y)
  }
  return total
}

function segmentDuration(key: SegmentKey): number {
  const connection = CONNECTIONS.find((c) => c.segment === key)
  if (!connection) throw new Error(`No connection defines segment: ${key}`)
  const length = polylineLength(connectionPoints(connection).full)
  return Math.round((length / TRAVEL_SPEED_PX_PER_SECOND) * 1000)
}

export const SEGMENT_DURATIONS_MS: Record<SegmentKey, number> = {
  devCond: segmentDuration('devCond'),
  condKin: segmentDuration('condKin'),
  kinS3: segmentDuration('kinS3'),
  s3Sqs: segmentDuration('s3Sqs'),
  sqsLambda: segmentDuration('sqsLambda'),
  lambdaParser: segmentDuration('lambdaParser'),
  parserOutput: segmentDuration('parserOutput'),
  outputAthena: segmentDuration('outputAthena'),
  parserDlq: segmentDuration('parserDlq'),
  dlqReturn: segmentDuration('dlqReturn'),
}

function segmentPath(key: SegmentKey): string {
  const connection = CONNECTIONS.find((c) => c.segment === key)
  if (!connection) throw new Error(`No connection defines segment: ${key}`)
  return polyline(connectionPoints(connection).full)
}

// Spelled out key by key rather than reduced from CONNECTIONS, so the
// compiler checks that every SegmentKey actually has a path. A filtered
// reduce would need a cast, and a missing segment would then surface as a
// token that silently never moves.
export const SEGMENTS: Record<SegmentKey, string> = {
  devCond: segmentPath('devCond'),
  condKin: segmentPath('condKin'),
  kinS3: segmentPath('kinS3'),
  s3Sqs: segmentPath('s3Sqs'),
  sqsLambda: segmentPath('sqsLambda'),
  lambdaParser: segmentPath('lambdaParser'),
  parserOutput: segmentPath('parserOutput'),
  outputAthena: segmentPath('outputAthena'),
  parserDlq: segmentPath('parserDlq'),
  dlqReturn: segmentPath('dlqReturn'),
}

export type Phase =
  | 'idle'
  | 'traveling-common'
  | 'traveling-success'
  | 'traveling-failure'
  | 'in-dlq'
  | 'traveling-redrive'
  | 'done-success'

// The diagram no longer has a file the visitor sent through by hand, so
// the live region reports on the pipeline itself: how much work is backed
// up, and whether a redrive is in flight. This is the only narration a
// screen reader gets for a diagram whose content is otherwise motion, so
// it says what changed rather than describing the animation.
export function pipelineStatus(dlqCount: number, redriving: boolean): string {
  if (redriving) {
    return 'Redriving the backlog through SQS to the parser.'
  }
  if (dlqCount === 0) {
    return 'Telemetry is flowing through the pipeline. Nothing is backed up.'
  }
  const files = dlqCount === 1 ? '1 file' : `${dlqCount} files`
  return `${files} failed to parse and ${dlqCount === 1 ? 'is' : 'are'} held in the DLQ. Redrive once the parser is fixed.`
}
