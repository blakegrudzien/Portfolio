import { useState, type CSSProperties } from 'react'
import { cx } from '../../utils/cx'
import { NodeInfoPanel } from './NodeInfoPanel'
import styles from './PipelineDiagram.module.css'
import {
  AMBIENT_PATH,
  AMBIENT_TOKENS,
  NODE_HEIGHT,
  NODE_INFO,
  NODE_WIDTH,
  NODES,
  REGIONS,
  STATIC_EDGES,
  getNode,
  statusText,
  type DiagramNode,
  type NodeId,
} from './pipelineData'
import { TelemetryPreview } from './TelemetryPreview'
import { usePipelineAnimation } from './usePipelineAnimation'

function nodeAccessibleLabel(node: DiagramNode): string {
  const label = node.lines.join(' ')
  const info = NODE_INFO[node.id]
  return info.tradeoff
    ? `${label}. ${info.context} ${info.tradeoff}`
    : `${label}. ${info.context}`
}

// The kinesis/SQS particle effects sit a fixed offset above their node,
// spread across three points — derived from each node's own x/y (rather
// than restated as independent magic numbers) so they can't silently drift
// out of alignment if a node's position in NODES ever changes.
function threeDotPositions(node: DiagramNode) {
  return [node.x - 15, node.x, node.x + 15].map((dotX) => ({
    cx: dotX,
    cy: node.y - 38,
  }))
}

const kinesisNode = getNode('kinesis')
const sqsNode = getNode('sqs')
const lambdaNode = getNode('lambda')
const slackNode = getNode('slack')

export function PipelineDiagram() {
  const { phase, highlightedNode, tokenRef, notified, addTelemetry, redrive } =
    usePipelineAnimation()
  const [showRegions, setShowRegions] = useState(false)
  const [activeInfoId, setActiveInfoId] = useState<NodeId | null>(null)

  const activeNode = activeInfoId ? getNode(activeInfoId) : undefined
  const activeInfo = activeNode
    ? {
        label: activeNode.lines.join(' '),
        context: NODE_INFO[activeNode.id].context,
        tradeoff: NODE_INFO[activeNode.id].tradeoff,
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

          {/* No role="img": this SVG holds genuinely interactive,
          individually-focusable node controls (role="button" below), and
          role="img" tells assistive tech to flatten a subtree into one
          static picture — in tension with descendants meant to be
          tabbed to and read individually. aria-label alone still gives
          the whole diagram a name without claiming it's a single image. */}
          <svg
            className={styles.diagram}
            viewBox="0 0 1180 440"
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
                className={cx(
                  styles.node,
                  highlightedNode === node.id && styles.nodeActive,
                  activeInfoId === node.id && styles.nodeInfoActive,
                  node.id === 'athena' &&
                    highlightedNode === 'athena' &&
                    styles.queryPulse,
                )}
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

            {/* Per-stop effects — each mounts fresh whenever `highlightedNode`
                transitions to that id, which is what makes a one-shot CSS
                animation replay every time the token passes through again. */}
            {highlightedNode === 'kinesis' &&
              threeDotPositions(kinesisNode).map((pos, i) => (
                <circle
                  key={i}
                  className={styles.streamDot}
                  cx={pos.cx}
                  cy={pos.cy}
                  r={3}
                />
              ))}

            {highlightedNode === 'sqs' &&
              threeDotPositions(sqsNode).map((pos, i) => (
                <circle
                  key={i}
                  className={styles.queueDot}
                  cx={pos.cx}
                  cy={pos.cy}
                  r={3}
                />
              ))}

            {highlightedNode === 'lambda' && (
              <circle
                className={styles.pingBurst}
                cx={lambdaNode.x}
                cy={lambdaNode.y}
                r={4}
              />
            )}

            {notified && (
              <circle
                className={styles.pingBurst}
                cx={slackNode.x}
                cy={slackNode.y}
                r={4}
              />
            )}

            {/* offset-path is set via a CSS custom property, not a direct
              style.offsetPath assignment — custom properties always go
              through setProperty under the hood (there's no dot-notation
              accessor for them), which sidesteps the same silent no-op
              that direct offset-path/offset-distance assignment hit in
              usePipelineAnimation's runSegment. animationDelay is a
              well-established property, so normal camelCase assignment is
              fine for it. */}
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
            is never null when runSegment fires — setPhase doesn't take effect
            until after the current handler returns, so a conditional
            mount driven by `phase` would still read the pre-update value
            at the moment runSegment runs. Visibility is CSS-driven instead. */}
            <circle
              ref={tokenRef}
              className={cx(
                styles.token,
                phase === 'in-dlq' && styles.tokenHeld,
              )}
              r={8}
            />
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
