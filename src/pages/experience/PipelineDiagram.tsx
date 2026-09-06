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
  pipelineStatus,
  type DiagramNode,
  type NodeId,
} from './pipelineData'
import { payloadStage } from './pipelineFlow'
import { NodeGlyph } from './pipelineGlyphs'
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
  const { flows, dlqCount, redriving, registerToken, redrive } =
    usePipelineAnimation()
  const [showRegions, setShowRegions] = useState(false)
  const [activeInfoId, setActiveInfoId] = useState<NodeId | null>(null)

  // The newest flow. Spawning appends, and the only removal is Athena
  // evicting its oldest, so the last entry is always the most recent
  // emission, which is enough to key the device's animation off without keeping a
  // second piece of state that says the same thing.
  const latestEmissionId = flows[flows.length - 1]?.id

  const activeNode = activeInfoId ? getNode(activeInfoId) : undefined
  const activeInfo = activeNode
    ? {
        label: activeNode.lines.join(' '),
        context: NODE_INFO[activeNode.id].context,
        tradeoff: NODE_INFO[activeNode.id].tradeoff,
        payload: NODE_INFO[activeNode.id].payload,
      }
    : null

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
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
          static picture, which is in tension with descendants meant to be
          tabbed to and read individually. aria-label alone still gives
          the whole diagram a name without claiming it's a single image. */}
          <svg
            className={styles.diagram}
            viewBox="0 0 1200 574"
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
                    activeInfoId === node.id && styles.nodeInfoActive,
                  )}
                  /* Selection is by click, not hover. The diagram runs on
                  its own, so a reader watching it move drags the cursor
                  across nodes constantly, and hover meant the panel below
                  swapped content the whole time they were just watching.
                  Click also gives touch devices the same behaviour, where
                  there is no hover to rely on at all. Focus still selects,
                  so tabbing through the nodes reads them in order. */
                  onFocus={() => setActiveInfoId(node.id)}
                  onBlur={() =>
                    setActiveInfoId((cur) => (cur === node.id ? null : cur))
                  }
                  /* Plain set, not a toggle. Clicking a node focuses it
                  first, so onFocus has already selected it by the time the
                  click lands, and a toggle would immediately undo that and
                  make clicking look broken. Deselecting is blur's job. */
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
                  <NodeGlyph
                    id={node.id}
                    eventKey={
                      node.id === 'device' ? latestEmissionId : undefined
                    }
                  />
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

            {/* Slack's own notification badge, sitting on its mark. It
                counts the whole DLQ rather than announcing each arrival:
                NODE_INFO records that this alert became a daily digest
                instead of a realtime ping, and a number that goes up and
                gets cleared is what a digest looks like. */}
            {dlqCount > 0 && (
              <g
                className={styles.slackBadge}
                transform={`translate(${slackNode.x + 20}, ${slackNode.y - 20})`}
                aria-hidden="true"
              >
                <circle r={9} />
                <text y={0.5}>{dlqCount}</text>
              </g>
            )}

            {/* Every token in flight: ambient background traffic and the
                visitor's own telemetry alike. They differ only in size and
                color: the mechanism moving them is identical, so pacing and
                failure handling apply to both without special cases. The
                one inversion is inside the parser, where a token keeping its
                normal fill on that solid black box would simply vanish,
                and the point of the box is that the file goes *into*
                something opaque, not that it disappears. The DLQ settle
                animation is highlighted-only, since it animates *from*
                accent, a color ambient tokens never have. Each token's
                motion is driven imperatively via its registered element
                (see usePipelineAnimation). */}
            {flows.map((flow) => {
              // The payload is a file, so it's drawn as one: a rectangle,
              // not a dot. A device emits several separate readings and
              // the condenser is what makes them into a single file, so
              // before that stop the token is several small marks that
              // converge. The batching is the thing you watch happen.
              const stage = payloadStage(flow.arrivedAt)
              const merged = stage !== 'events'
              const height = 10
              const openWidth = 15
              // Squeezed along one axis only. Something that shrinks in
              // both directions has just got further away; something that
              // narrows while staying as tall has been compressed.
              const width = stage === 'gzipped' ? openWidth * 0.55 : openWidth
              const eventSize = 4.8
              // The mark means "the parser can't read this", so it's shown
              // for exactly as long as that's true.
              //
              // Compression genuinely hides it, which is the whole reason
              // nothing upstream of the parser can catch it and the DLQ has
              // to exist: it shows on the readings, vanishes once the file
              // is gzipped, and is back the moment Lambda opens it up.
              //
              // It also clears at Parquet. A redriven file still carries
              // the same bytes that failed the first time, but by the time
              // it's columnar output the parser has been fixed and has read
              // it, so the file is no longer unreadable and the grid
              // shouldn't keep flagging it. That the mark survives the DLQ
              // and disappears on the way out of the parser is the point:
              // what got fixed was the parser, not the file.
              const defectVisible =
                flow.malformed && stage !== 'gzipped' && stage !== 'parquet'
              const inset = 1.6
              return (
                <g
                  key={flow.id}
                  ref={(el) => registerToken(flow.id, el)}
                  className={styles.token}
                >
                  {flow.dots.map((dot, i) => (
                    <rect
                      key={i}
                      className={styles.tokenDot}
                      x={-eventSize / 2}
                      y={-eventSize / 2}
                      width={eventSize}
                      height={eventSize}
                      rx={1.2}
                      style={{
                        translate: merged ? '0 0' : `${dot.x}px ${dot.y}px`,
                        opacity: merged ? 0 : 1,
                      }}
                    />
                  ))}

                  <rect
                    className={styles.tokenBody}
                    x={-width / 2}
                    y={-height / 2}
                    width={width}
                    height={height}
                    rx={2}
                    style={{ opacity: merged ? 1 : 0 }}
                  />

                  {/* Bands across a narrowed file: it's been squeezed and
                      strapped. Horizontal here and vertical for Parquet
                      below, so the two states share one vocabulary,
                      lines in the file, and are told apart by which way
                      they run. */}
                  <g
                    className={styles.tokenMarks}
                    style={{ opacity: stage === 'gzipped' ? 1 : 0 }}
                  >
                    {[-0.22, 0.22].map((at) => (
                      <rect
                        key={at}
                        x={-width / 2 + inset}
                        y={height * at}
                        width={width - inset * 2}
                        height={1}
                      />
                    ))}
                  </g>

                  {/* Columns. The same three stripes the Parquet output
                      bucket is drawn with, so the file visibly becomes
                      the thing that node stores. */}
                  <g
                    className={styles.tokenMarks}
                    style={{ opacity: stage === 'parquet' ? 1 : 0 }}
                  >
                    {[-0.26, 0, 0.26].map((at) => (
                      <rect
                        key={at}
                        x={width * at}
                        y={-height / 2 + inset}
                        width={1}
                        height={height - inset * 2}
                      />
                    ))}
                  </g>

                  {/* A bite out of the corner, in page background: a flaw
                      in the file rather than a badge stuck on it. */}
                  <circle
                    className={styles.tokenNotch}
                    r={height * 0.26}
                    cx={width / 2}
                    cy={-height / 2}
                    style={{ opacity: merged && defectVisible ? 1 : 0 }}
                  />
                  {/* Before the batch exists the flaw is in one reading,
                      so it's there in the very first frame. */}
                  <circle
                    className={styles.tokenNotch}
                    r={eventSize * 0.28}
                    cx={(flow.dots[0]?.x ?? 0) + eventSize / 2}
                    cy={(flow.dots[0]?.y ?? 0) - eventSize / 2}
                    style={{ opacity: !merged && flow.malformed ? 1 : 0 }}
                  />
                </g>
              )
            })}
          </svg>

          <p className={styles.status} aria-live="polite">
            {pipelineStatus(dlqCount, redriving)}
          </p>

          <div className={styles.controls}>
            {/* The only control left. Everything else the diagram does, it
                does on its own, but a backlog that nothing can clear is
                a dead end, and clearing it is the one action an operator
                actually takes here. */}
            <button
              type="button"
              className={styles.primaryButton}
              onClick={redrive}
              disabled={dlqCount === 0 || redriving}
            >
              Redrive the DLQ
            </button>
          </div>
        </div>
      </div>

      <NodeInfoPanel info={activeInfo} />
    </div>
  )
}
