// Every node id in the diagram, as a closed union rather than a bare
// `string` — a typo'd id (e.g. in a SequenceStep's `arrival`) becomes a
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
   * no longer uniform boxes — each one is a bespoke illustration (see
   * pipelineGlyphs) — so size is per node rather than two shared
   * constants. Edge trimming below derives from this too, which is what
   * keeps the line art from running underneath the artwork. */
  width: number
  height: number
}

// Positions are hand-placed, but only here: every edge path, every token
// path and every hit target is derived from them further down. Moving a
// node is a one-line change.
export const NODES: DiagramNode[] = [
  { id: 'device', lines: ['Devices'], x: 108, y: 56, width: 132, height: 60 },
  {
    id: 'condenser',
    lines: ['Telemetry', 'condenser'],
    x: 108,
    y: 176,
    width: 116,
    height: 52,
  },
  {
    id: 'kinesis',
    lines: ['Kinesis', 'Firehose'],
    x: 108,
    y: 310,
    width: 108,
    height: 60,
  },
  {
    id: 's3lake',
    lines: ['S3 data lake'],
    x: 296,
    y: 310,
    width: 128,
    height: 76,
  },
  { id: 'sqs', lines: ['SQS'], x: 468, y: 310, width: 112, height: 60 },
  { id: 'lambda', lines: ['Lambda'], x: 616, y: 310, width: 108, height: 60 },
  {
    id: 'parser',
    lines: ['The parser'],
    x: 764,
    y: 310,
    width: 112,
    height: 60,
  },
  {
    id: 'output',
    lines: ['Parquet output'],
    x: 936,
    y: 160,
    width: 108,
    height: 64,
  },
  { id: 'athena', lines: ['Athena'], x: 1084, y: 160, width: 112, height: 72 },
  { id: 'dlq', lines: ['DLQ'], x: 936, y: 414, width: 100, height: 68 },
  { id: 'slack', lines: ['Slack'], x: 1084, y: 414, width: 92, height: 56 },
]

export function getNode(id: NodeId): DiagramNode {
  const node = NODES.find((n) => n.id === id)
  if (!node) throw new Error(`Unknown node id: ${id}`)
  return node
}

// Context (always) and the real tradeoff reasoning (where one exists) per
// node — this is where the actual engineering judgment lives, not in a
// separate prose block disconnected from the diagram. Nodes without a
// documented decision only get context; not every step was a deliberate
// choice worth defending. A Record keyed by the closed NodeId union (not
// Record<string, ...>) makes this exhaustive — every node is guaranteed an
// entry, checked by the compiler rather than by remembering to fill one in.
export const NODE_INFO: Record<NodeId, { context: string; tradeoff?: string }> =
  {
    device: {
      context:
        "Level Home's smart locks, doorbells, and bridges emit telemetry as they operate.",
    },
    condenser: {
      context: 'Pre-processes and batches device events before they move on.',
    },
    kinesis: {
      context: 'Streams the batched telemetry into the data lake.',
    },
    s3lake: {
      context: 'Every raw file lands here first, before anything gets parsed.',
    },
    sqs: {
      context:
        'An event notification queues up here the moment a new file lands.',
      tradeoff:
        "Chosen over EventBridge — EventBridge's main advantage is fanning out to multiple destinations, which didn't matter here (there's only one pathway). SQS came with a native DLQ and simple retry mechanics out of the box, and was cheaper.",
    },
    lambda: {
      context: 'Picks up the queued file and hands it to the parser.',
      tradeoff:
        'Both success and failure route through this same function — one central place to check either outcome, and it keeps parsing logic separate from placement logic.',
    },
    parser: {
      context:
        'Decodes the raw device bytes into a structured record. Firmware-team owned — this project treats it as a pluggable step, not something its own code needs to understand internally.',
    },
    output: {
      context: 'Successfully parsed records get converted and written here.',
      tradeoff:
        'Uses Apache Arrow to write Parquet. Originally used DuckDB, but it required CGo=1, which meant adjusting other parts of the project to accommodate it — Arrow worked without that constraint.',
    },
    athena: {
      context:
        'Queries run directly against the Parquet files here — no separate database to keep in sync.',
    },
    dlq: {
      context: 'Failed files land here instead of being deleted.',
      tradeoff:
        "Uses the plain SQS dead-letter queue rather than a custom one. A custom DLQ could retry only genuine AWS/connectivity errors and give up immediately on unrecoverable parsing errors — the native one can't tell the difference. Traded that precision for needing zero custom code and being able to reprocess the whole queue with one command.",
    },
    slack: {
      context: 'Notifies the firmware team when a file fails.',
      tradeoff:
        'Started as a real-time alert bot, but the firmware team said that was more than they needed, so it became a daily digest instead. Redriving straight from Slack was considered too, then deliberately dropped once it was clear the firmware team would have AWS console access anyway.',
    },
  }

// Overlapping bounding regions grouping nodes by role, matching the shape
// of Blake's own Excalidraw sketch. The sketch used blue/red/green; this
// stays inside the site's locked bg/ink/accent palette instead, so the
// three are told apart by border style (solid/dashed/dotted) and label
// text rather than by introducing new hues. Hand-fit bounding boxes, not
// derived from NODES — unlike the edges below, a region has to wrap
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
    y: 258,
    width: 622,
    height: 126,
    labelX: 230,
    labelY: 278,
  },
  {
    id: 'failure',
    label: 'Failure pathway',
    x: 396,
    y: 258,
    width: 750,
    height: 258,
    dash: '10 6',
    labelX: 412,
    labelY: 278,
  },
  {
    id: 'success',
    label: 'Success pathway',
    x: 694,
    y: 110,
    width: 460,
    height: 274,
    dash: '2 4',
    labelX: 876,
    labelY: 130,
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
 * than its box does. Edges have to clear the label too — otherwise a
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
 * bounds. Used to trim edges back to the node boundary — the diagonal
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
 * thing — on the floor of the lake, in a slot of the queue, in a cell of
 * Athena's grid — rather than stopping on top of a picture of it. That's
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
  sqs: [
    { x: -33, y: 0 },
    { x: -11, y: 0 },
    { x: 11, y: 0 },
    { x: 33, y: 0 },
  ],
  lambda: [{ x: 0, y: 0 }],
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
   * nodes. Only the redrive return needs them — it detours below the
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
      { x: 936, y: 496 },
      { x: 468, y: 496 },
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
    /** Center to center — where a token actually travels, since arriving
     * "at" a node means arriving at its middle. */
    full: [from, ...waypoints, to],
    /** Trimmed to the node boundaries — what gets drawn. */
    trimmed: [
      boxExit(from, firstAfterStart),
      ...waypoints,
      boxExit(to, lastBeforeEnd),
    ],
  }
}

// Background line art — every edge in the diagram, drawn once and never
// animated.
export const STATIC_EDGES: { d: string; dashed?: boolean }[] = CONNECTIONS.map(
  (connection) => ({
    d: polyline(connectionPoints(connection).trimmed),
    dashed: connection.dashed,
  }),
)

// One path per node-to-node hop — deliberately finer-grained than the
// diagram's visual "legs", because a flow's arrivedAt (and every per-stop
// effect keyed off it) only updates at a segment's end. A single
// device-to-parser transition would never pass through an intermediate
// "arrived at Kinesis" state to hang an effect on.
function segmentPath(key: SegmentKey): string {
  const connection = CONNECTIONS.find((c) => c.segment === key)
  if (!connection) throw new Error(`No connection defines segment: ${key}`)
  return polyline(connectionPoints(connection).full)
}

// Spelled out key by key rather than reduced from CONNECTIONS, so the
// compiler checks that every SegmentKey actually has a path — a filtered
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

export const statusText: Record<Phase, string> = {
  idle: 'Add a telemetry file to watch it move through the pipeline.',
  'traveling-common': 'Telemetry is moving from the device toward the parser.',
  'traveling-success': 'The parsed file is being written to the output bucket.',
  'traveling-failure': 'The file failed to parse and is moving to the DLQ.',
  'in-dlq':
    'The file is in the DLQ. Slack notified the firmware team. Redrive it once the parser is fixed.',
  'traveling-redrive':
    'The redriven file is moving back through SQS to the parser.',
  'done-success': 'Landed in the output bucket, queryable via Athena.',
}
