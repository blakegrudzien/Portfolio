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
}

export const NODE_WIDTH = 140
export const NODE_HEIGHT = 56

export const NODES: DiagramNode[] = [
  { id: 'device', lines: ['Device'], x: 60, y: 40 },
  { id: 'condenser', lines: ['Telemetry', 'condenser'], x: 60, y: 140 },
  { id: 'kinesis', lines: ['Kinesis', 'Firehose'], x: 60, y: 240 },
  { id: 's3lake', lines: ['S3 data', 'lake'], x: 240, y: 240 },
  { id: 'sqs', lines: ['SQS'], x: 420, y: 240 },
  { id: 'lambda', lines: ['Lambda'], x: 580, y: 240 },
  { id: 'parser', lines: ['The parser'], x: 740, y: 240 },
  { id: 'output', lines: ['Parquet', 'output'], x: 920, y: 130 },
  { id: 'athena', lines: ['Athena'], x: 1060, y: 130 },
  { id: 'dlq', lines: ['DLQ'], x: 920, y: 340 },
  { id: 'slack', lines: ['Slack'], x: 1060, y: 340 },
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
// derived from NODES — unlike the point-effects below, a region has to
// wrap several nodes plus padding, which isn't a clean offset from a
// single node's coordinates.
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
    x: 150,
    y: 192,
    width: 680,
    height: 96,
    labelX: 166,
    labelY: 212,
  },
  {
    id: 'failure',
    label: 'Failure pathway',
    x: 330,
    y: 192,
    width: 680,
    height: 196,
    dash: '10 6',
    labelX: 346,
    labelY: 372,
  },
  {
    id: 'success',
    label: 'Success pathway',
    x: 650,
    y: 82,
    width: 500,
    height: 206,
    dash: '2 4',
    labelX: 850,
    labelY: 102,
  },
]

// Background line art — every edge in the diagram, drawn once and never
// animated. The redrive return line detours below the main row so it
// doesn't cut across the SQS/Lambda/parser boxes.
export const STATIC_EDGES: { d: string; dashed?: boolean }[] = [
  { d: 'M 60,40 L 60,140' },
  { d: 'M 60,140 L 60,240' },
  { d: 'M 60,240 L 240,240' },
  { d: 'M 240,240 L 420,240' },
  { d: 'M 420,240 L 580,240' },
  { d: 'M 580,240 L 740,240' },
  { d: 'M 740,240 L 920,130' },
  { d: 'M 920,130 L 1060,130' },
  { d: 'M 740,240 L 920,340' },
  { d: 'M 920,340 L 1060,340' },
  { d: 'M 920,340 L 920,395 L 420,395 L 420,240', dashed: true },
]

// One path per node-to-node hop — deliberately finer-grained than the
// diagram's visual "legs", because highlightedNode (and every per-stop
// effect keyed off it) only updates at a segment's end. A single
// Device-to-parser transition would never pass through an intermediate
// "arrived at Kinesis" state to hang an effect on. Segment paths mirror
// the static edges above so the token tracks the visible line art exactly.
export const SEGMENTS = {
  devCond: 'M 60,40 L 60,140',
  condKin: 'M 60,140 L 60,240',
  kinS3: 'M 60,240 L 240,240',
  s3Sqs: 'M 240,240 L 420,240',
  sqsLambda: 'M 420,240 L 580,240',
  lambdaParser: 'M 580,240 L 740,240',
  parserOutput: 'M 740,240 L 920,130',
  outputAthena: 'M 920,130 L 1060,130',
  parserDlq: 'M 740,240 L 920,340',
  dlqReturn: 'M 920,340 L 920,395 L 420,395 L 420,240',
} as const

export type SegmentKey = keyof typeof SEGMENTS

// Ambient traffic: the pipeline runs continuously on its own, not just
// when a visitor adds telemetry — a few small, muted tokens loop the full
// success journey via a plain CSS animation (staggered with negative
// delays so they don't move in lockstep), independent of the JS state
// machine driving the interactive token. Always the success route; these
// represent normal background volume, not the failure case a visitor
// deliberately triggers. Ambient tokens don't need per-segment stops —
// it's one continuous looping path, built by concatenating every segment
// on the success route.
export const AMBIENT_PATH = [
  SEGMENTS.devCond,
  SEGMENTS.condKin,
  SEGMENTS.kinS3,
  SEGMENTS.s3Sqs,
  SEGMENTS.sqsLambda,
  SEGMENTS.lambdaParser,
  SEGMENTS.parserOutput,
  SEGMENTS.outputAthena,
]
  .map((seg, i) => (i === 0 ? seg : seg.replace(/^M [\d.]+,[\d.]+ /, '')))
  .join(' ')

export const AMBIENT_TOKENS = [
  { id: 'amb-1', delay: '0s' },
  { id: 'amb-2', delay: '-2.5s' },
  { id: 'amb-3', delay: '-5s' },
]

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
