import { useState } from 'react'
import { cx } from '../../utils/cx'
import { NodeInfoPanel } from './NodeInfoPanel'
import styles from './PipelineDiagram.module.css'
import {
  DIAGRAM_VIEWBOX,
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
import { SLACK_BRAND } from './slackBrand'
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
  const {
    flows,
    dlqCount,
    redriving,
    registerToken,
    redrive,
    paused,
    togglePaused,
    canPause,
  } = usePipelineAnimation()
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

          {/* The diagram holds its width rather than scaling down to fit a
          phone, since at 390px the labels would land around 8px. So on a
          narrow screen it scrolls sideways, and the hint below says so:
          a scroll region that gives no sign of being one just looks like a
          diagram with its right-hand side missing. Only the artwork
          scrolls, not the controls and status text under it. */}
          <div className={styles.diagramScroll}>
            {/* The artwork and the controls are two layers in one box: the
            SVG draws, and a grid of real <button> elements positioned over
            it does the interacting.

            The nodes used to be <g tabIndex={0} role="button">. That is the
            pattern with a long history of browsers disagreeing about
            whether an SVG child element can be focused at all, Safari in
            particular, so the keyboard path through the diagram depended on
            which browser you arrived in. An outline over the top sidesteps
            the question instead of betting on it: a button is focusable,
            activates on Enter and Space without being told to, and gets the
            site's focus ring from base.css, which `outline` on an SVG
            element does not reliably draw. */}
            <div className={styles.stage}>
              {/* Decorative, now that every label a screen reader needs is
              on the button covering it. Naming it here as well would read
              the whole diagram out twice. */}
              <svg
                className={styles.diagram}
                viewBox={`0 0 ${DIAGRAM_VIEWBOX.width} ${DIAGRAM_VIEWBOX.height}`}
                aria-hidden="true"
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
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                  >
                    {/* Artwork only. Being selected restyles it, but the
                      control that does the selecting is a real button in the
                      layer over this SVG, not this group. */}
                    <g
                      className={
                        activeInfoId === node.id
                          ? styles.nodeInfoActive
                          : undefined
                      }
                    >
                      <NodeGlyph
                        id={node.id}
                        eventKey={
                          node.id === 'device' ? latestEmissionId : undefined
                        }
                      />
                      <text
                        className={styles.nodeLabel}
                        y={node.height / 2 + 15}
                      >
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
                    <circle r={9} fill={SLACK_BRAND.rose} />
                    {/* Clamped, the way Slack's own badge is, because the count
                    is not bounded and the circle is 18px across: a third
                    digit would print outside it. Two characters is what
                    fits, so the ceiling is 9 rather than Slack's 99. */}
                    <text y={0.5}>{dlqCount > 9 ? '9+' : dlqCount}</text>
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
                  const width =
                    stage === 'gzipped' ? openWidth * 0.55 : openWidth
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

              {/* One control per node, each sized and placed from the same
              numbers that drew the node, as percentages of the stage, so
              they stay registered to the artwork at every width the SVG
              scales to.

              A fieldset so the set has a name without role="group" on a
              div, which is the same thing spelled less well. MarbleTray
              names its twelve marble buttons the same way. */}
              <fieldset className={styles.nodeControls}>
                <legend className="visually-hidden">
                  Telemetry pipeline diagram
                </legend>
                {NODES.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className={cx(
                      styles.nodeControl,
                      activeInfoId === node.id && styles.nodeControlActive,
                    )}
                    style={{
                      left: `${((node.x - node.width / 2) / DIAGRAM_VIEWBOX.width) * 100}%`,
                      top: `${((node.y - node.height / 2) / DIAGRAM_VIEWBOX.height) * 100}%`,
                      width: `${(node.width / DIAGRAM_VIEWBOX.width) * 100}%`,
                      height: `${(node.height / DIAGRAM_VIEWBOX.height) * 100}%`,
                    }}
                    /* Selection is by click and by focus, not hover. The
                    diagram runs on its own, so a reader watching it move
                    drags the cursor across nodes constantly, and on hover
                    the panel below swapped content the whole time they were
                    only watching. Click gives touch devices the same
                    behaviour, where there is no hover at all. Focus still
                    selects, so tabbing reads the nodes in order.

                    Plain set rather than a toggle: clicking focuses first,
                    so onFocus has already selected by the time the click
                    lands, and toggling would undo it and make clicking look
                    broken. Deselecting is blur's job. Enter and Space need
                    no handler now that this is a real button. */
                    onFocus={() => setActiveInfoId(node.id)}
                    onBlur={() =>
                      setActiveInfoId((cur) => (cur === node.id ? null : cur))
                    }
                    onClick={() => setActiveInfoId(node.id)}
                  >
                    <span className="visually-hidden">
                      {nodeAccessibleLabel(node)}
                    </span>
                  </button>
                ))}
              </fieldset>
            </div>
          </div>

          {/* Hidden by CSS at widths where the whole diagram fits, so it
          never claims a scroll that isn't there. */}
          <p className={styles.scrollHint}>
            Scroll the diagram sideways to follow the whole pipeline.
          </p>

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
            {canPause && (
              <button
                type="button"
                className={styles.quietButton}
                onClick={togglePaused}
              >
                {paused ? 'Resume' : 'Pause'} the animation
              </button>
            )}
          </div>
        </div>
      </div>

      <NodeInfoPanel info={activeInfo} />
    </div>
  )
}
