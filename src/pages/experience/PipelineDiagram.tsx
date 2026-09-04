import { useRef, useState, type CSSProperties } from 'react'
import { NodeInfoPanel } from './NodeInfoPanel'
import styles from './PipelineDiagram.module.css'
import { TelemetryPreview } from './TelemetryPreview'

interface DiagramNode {
  id: string
  lines: string[]
  x: number
  y: number
}

const NODE_WIDTH = 140
const NODE_HEIGHT = 56

const NODES: DiagramNode[] = [
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

// Context (always) and the real tradeoff reasoning (where one exists) per
// node — this is where the actual engineering judgment lives, not in a
// separate prose block disconnected from the diagram. Nodes without a
// documented decision only get context; not every step was a deliberate
// choice worth defending.
const NODE_INFO: Record<string, { context: string; tradeoff?: string }> = {
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
// text rather than by introducing new hues.
const REGIONS: {
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
const STATIC_EDGES: { d: string; dashed?: boolean }[] = [
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

// The paths the token actually travels, one "leg" at a time — legPaths
// intentionally mirror the static edges above so the moving token tracks
// the visible line art exactly.
const LEG_PATHS = {
  common: 'M 60,40 L 60,140 L 60,240 L 240,240 L 420,240 L 580,240 L 740,240',
  success: 'M 740,240 L 920,130 L 1060,130',
  failure: 'M 740,240 L 920,340',
  redrive: 'M 920,340 L 920,395 L 420,395 L 420,240 L 580,240 L 740,240',
} as const

// Ambient traffic: the pipeline runs continuously on its own, not just
// when a visitor adds telemetry — a few small, muted tokens loop the full
// success journey via a plain CSS animation (staggered with negative
// delays so they don't move in lockstep), independent of the JS state
// machine driving the interactive token. Always the success route; these
// represent normal background volume, not the failure case a visitor
// deliberately triggers.
const AMBIENT_PATH = `${LEG_PATHS.common} ${LEG_PATHS.success.replace('M 740,240 ', '')}`
const AMBIENT_TOKENS = [
  { id: 'amb-1', delay: '0s' },
  { id: 'amb-2', delay: '-2.5s' },
  { id: 'amb-3', delay: '-5s' },
]

type LegKey = keyof typeof LEG_PATHS

export type Phase =
  | 'idle'
  | 'traveling-common'
  | 'traveling-success'
  | 'traveling-failure'
  | 'in-dlq'
  | 'traveling-redrive'
  | 'done-success'

const statusText: Record<Phase, string> = {
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

export function PipelineDiagram() {
  const [phase, setPhase] = useState<Phase>('idle')
  const tokenRef = useRef<SVGCircleElement>(null)
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null)
  const [showRegions, setShowRegions] = useState(false)
  const [activeInfoId, setActiveInfoId] = useState<string | null>(null)

  function nodeAccessibleLabel(node: DiagramNode): string {
    const label = node.lines.join(' ')
    const info = NODE_INFO[node.id]
    if (!info) return label
    return info.tradeoff
      ? `${label}. ${info.context} ${info.tradeoff}`
      : `${label}. ${info.context}`
  }

  function runLeg(leg: LegKey, arrivalNodeId: string, onDone: () => void) {
    const el = tokenRef.current
    if (!el) return

    // setProperty rather than camelCase assignment (el.style.offsetPath = ...)
    // — offset-path/offset-distance aren't reliably exposed as named
    // CSSStyleDeclaration accessors even where the CSS property itself is
    // supported, so the camelCase form can silently no-op.
    el.style.setProperty('transition', 'none')
    el.style.setProperty('offset-path', `path('${LEG_PATHS[leg]}')`)
    el.style.setProperty('offset-distance', '0%')
    el.style.setProperty('opacity', '1')
    // Force a reflow so the browser applies the reset above before the
    // transition below starts, otherwise both changes get batched into
    // one paint and the token never visibly jumps to the path's start.
    void el.getBoundingClientRect()

    requestAnimationFrame(() => {
      el.style.setProperty(
        'transition',
        'offset-distance var(--pipeline-leg-duration) linear',
      )
      el.style.setProperty('offset-distance', '100%')
    })

    const handleEnd = () => {
      el.removeEventListener('transitionend', handleEnd)
      setHighlightedNode(arrivalNodeId)
      onDone()
    }
    el.addEventListener('transitionend', handleEnd)
  }

  // The outcome is chosen upfront (two buttons, not a mid-journey pause) —
  // otherwise the token would sit waiting at the parser indefinitely if
  // the visitor just never clicked anything. It still travels the common
  // leg first, then chains straight into the chosen outcome leg with no
  // pause in between, so the payload panel still visibly flips from raw
  // bytes to decoded/error exactly when the token reaches the parser.
  function addTelemetry(outcome: 'success' | 'failure') {
    setHighlightedNode('device')
    setPhase('traveling-common')
    runLeg('common', 'parser', () => {
      if (outcome === 'success') {
        setPhase('traveling-success')
        runLeg('success', 'athena', () => setPhase('done-success'))
      } else {
        setPhase('traveling-failure')
        runLeg('failure', 'dlq', () => setPhase('in-dlq'))
      }
    })
  }

  function redrive() {
    setPhase('traveling-redrive')
    runLeg('redrive', 'parser', () => {
      // The whole point of a redrive is that the parser's been fixed —
      // it always succeeds on the retry.
      runLeg('success', 'athena', () => setPhase('done-success'))
    })
  }

  const notified = phase === 'in-dlq' || phase === 'traveling-redrive'

  const activeNode = activeInfoId
    ? NODES.find((n) => n.id === activeInfoId)
    : undefined
  const activeInfo = activeNode
    ? {
        label: activeNode.lines.join(' '),
        context: NODE_INFO[activeNode.id]?.context ?? '',
        tradeoff: NODE_INFO[activeNode.id]?.tradeoff,
      }
    : null

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <TelemetryPreview phase={phase} />
        <div className={styles.wrapper}>
          <button
            type="button"
            className={styles.regionsToggle}
            aria-pressed={showRegions}
            onClick={() => setShowRegions((v) => !v)}
          >
            {showRegions ? 'Hide' : 'Show'} pathway groupings
          </button>

          {/* role="img" is deliberate: this SVG is inline and dynamically
          rendered (nodes/token update via React state), so an actual
          <img> tag — which can only hold a static external src — isn't
          usable here. */}
          <svg
            className={styles.diagram}
            viewBox="0 0 1180 440"
            role="img"
            aria-label="Telemetry pipeline diagram"
          >
            {showRegions &&
              REGIONS.map((region) => (
                <g key={region.id}>
                  <rect
                    x={region.x}
                    y={region.y}
                    width={region.width}
                    height={region.height}
                    rx={16}
                    className={styles.region}
                    strokeDasharray={region.dash}
                  />
                  <text
                    x={region.labelX}
                    y={region.labelY}
                    className={styles.regionLabel}
                  >
                    {region.label}
                  </text>
                </g>
              ))}

            {STATIC_EDGES.map((edge) => (
              <path
                key={edge.d}
                d={edge.d}
                className={edge.dashed ? styles.edgeDashed : styles.edge}
              />
            ))}

            {NODES.map((node) => (
              <g
                key={node.id}
                tabIndex={0}
                role="button"
                aria-label={nodeAccessibleLabel(node)}
                transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
                className={[
                  styles.node,
                  highlightedNode === node.id ? styles.nodeActive : '',
                  activeInfoId === node.id ? styles.nodeInfoActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setActiveInfoId(node.id)}
                onMouseLeave={() =>
                  setActiveInfoId((cur) => (cur === node.id ? null : cur))
                }
                onFocus={() => setActiveInfoId(node.id)}
                onBlur={() =>
                  setActiveInfoId((cur) => (cur === node.id ? null : cur))
                }
                onClick={() => setActiveInfoId(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveInfoId(node.id)
                  }
                }}
              >
                <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx={10} />
                <text x={NODE_WIDTH / 2} y={NODE_HEIGHT / 2}>
                  {node.lines.map((line, i) => (
                    <tspan
                      key={line}
                      x={NODE_WIDTH / 2}
                      dy={
                        i === 0
                          ? node.lines.length > 1
                            ? '-0.3em'
                            : '0.32em'
                          : '1.1em'
                      }
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            ))}

            {notified && (
              <text x={1060} y="380" className={styles.notifyLabel}>
                notified
              </text>
            )}

            {/* offset-path is set via a CSS custom property, not a direct
              style.offsetPath assignment — custom properties always go
              through setProperty under the hood (there's no dot-notation
              accessor for them), which sidesteps the same silent no-op
              that direct offset-path/offset-distance assignment hit in
              runLeg above. animationDelay is a well-established property,
              so normal camelCase assignment is fine for it. */}
            {AMBIENT_TOKENS.map((t) => (
              <circle
                key={t.id}
                r={4}
                className={styles.ambientToken}
                style={
                  {
                    '--ambient-path': `path('${AMBIENT_PATH}')`,
                    animationDelay: t.delay,
                  } as CSSProperties
                }
              />
            ))}

            {/* Always mounted (never conditionally rendered) so tokenRef.current
            is never null when runLeg fires — setPhase doesn't take effect
            until after the current handler returns, so a conditional
            mount driven by `phase` would still read the pre-update value
            at the moment runLeg runs. Visibility is CSS-driven instead. */}
            <circle ref={tokenRef} className={styles.token} r={8} />
          </svg>

          <p className={styles.status} aria-live="polite">
            {statusText[phase]}
          </p>

          <div className={styles.controls}>
            {(phase === 'idle' || phase === 'done-success') && (
              <>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => addTelemetry('success')}
                >
                  Add correct telemetry
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => addTelemetry('failure')}
                >
                  Add incorrect telemetry
                </button>
              </>
            )}
            {phase === 'in-dlq' && (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={redrive}
              >
                Redrive
              </button>
            )}
          </div>
        </div>
      </div>

      <NodeInfoPanel info={activeInfo} />
    </div>
  )
}
