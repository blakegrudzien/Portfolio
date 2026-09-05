import { useState } from 'react'
import { cx } from '../../utils/cx'
import { NodeInfoPanel } from './NodeInfoPanel'
import styles from './PipelineDiagram.module.css'
import {
  NODE_INFO,
  NODES,
  REGIONS,
  STATIC_EDGES,
  getNode,
  statusText,
  type DiagramNode,
  type NodeId,
} from './pipelineData'
import { NodeGlyph } from './pipelineGlyphs'
import { TelemetryPreview } from './TelemetryPreview'
import { usePipelineAnimation } from './usePipelineAnimation'

function nodeAccessibleLabel(node: DiagramNode): string {
  const label = node.lines.join(' ')
  const info = NODE_INFO[node.id]
  return info.tradeoff
    ? `${label}. ${info.context} ${info.tradeoff}`
    : `${label}. ${info.context}`
}

const slackNode = getNode('slack')

export function PipelineDiagram() {
  const { flows, phase, notified, registerToken, addTelemetry, redrive } =
    usePipelineAnimation()
  const [showRegions, setShowRegions] = useState(false)
  const [activeInfoId, setActiveInfoId] = useState<NodeId | null>(null)

  const athenaOccupied = flows.some((flow) => flow.arrivedAt === 'athena')

  // The accent node highlight tracks the visitor's own telemetry only —
  // background traffic constantly re-accenting nodes would both add visual
  // noise and dilute what accent means everywhere else in the diagram.
  const highlightedFlowNode = flows.find(
    (flow) => flow.kind === 'highlighted',
  )?.arrivedAt

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
            viewBox="0 0 1200 530"
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
              // Two nested groups on purpose: the outer one only places
              // the node, so a CSS transform animation on the inner one
              // (Athena's query pulse) can't clobber the positioning the
              // way it would if both lived on a single element.
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                <g
                  tabIndex={0}
                  role="button"
                  aria-label={nodeAccessibleLabel(node)}
                  className={cx(
                    styles.node,
                    highlightedFlowNode === node.id && styles.nodeActive,
                    activeInfoId === node.id && styles.nodeInfoActive,
                    node.id === 'athena' && athenaOccupied && styles.queryPulse,
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
                  {/* Dropping the boxes also drops what used to look and
                      behave clickable, which would leave the hover info
                      undiscoverable. The affordance moves to these two:
                      an invisible, generous hit target, and an outline
                      that appears on hover or keyboard focus. */}
                  <rect
                    className={styles.hitArea}
                    x={-node.width / 2}
                    y={-node.height / 2}
                    width={node.width}
                    height={node.height}
                  />
                  <rect
                    className={styles.nodeOutline}
                    x={-node.width / 2}
                    y={-node.height / 2}
                    width={node.width}
                    height={node.height}
                    rx={10}
                  />
                  <NodeGlyph id={node.id} />
                  <text className={styles.nodeLabel} y={node.height / 2 + 15}>
                    {node.lines.map((line, i) => (
                      <tspan key={line} x={0} dy={i === 0 ? 0 : '1.15em'}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              </g>
            ))}

            {notified && (
              <text
                x={slackNode.x}
                y={slackNode.y - slackNode.height / 2 - 10}
                className={styles.notifyLabel}
              >
                notified
              </text>
            )}

            {/* Every token in flight — ambient background traffic and the
                visitor's own telemetry alike. They differ only in size and
                color: the mechanism moving them is identical, so pacing and
                failure handling apply to both without special cases. The
                one inversion is inside the parser — a token keeping its
                normal fill on that solid black box would simply vanish,
                and the point of the box is that the file goes *into*
                something opaque, not that it disappears. The DLQ settle
                animation is highlighted-only, since
                it animates *from* accent, a color ambient tokens never
                have. Each token's motion is driven imperatively via its
                registered element (see usePipelineAnimation). */}
            {flows.map((flow) => (
              <circle
                key={flow.id}
                ref={(el) => registerToken(flow.id, el)}
                className={cx(
                  styles.token,
                  flow.kind === 'highlighted'
                    ? styles.tokenHighlighted
                    : styles.tokenAmbient,
                  flow.kind === 'highlighted' &&
                    flow.phase === 'in-dlq' &&
                    styles.tokenHeld,
                  flow.arrivedAt === 'parser' && styles.tokenInParser,
                )}
                r={flow.kind === 'highlighted' ? 8 : 4}
              />
            ))}
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
