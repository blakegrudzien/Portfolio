import styles from './PipelineDiagram.module.css'
import type { NodeId } from './pipelineData'

// The node artwork. Each glyph draws in its own coordinate space centered
// on (0, 0), since the parent <g> places it, so a node can be moved in NODES
// without any of its geometry needing to be rewritten.
//
// These replace the eleven identical rounded rectangles the diagram used
// to be. The reasoning: with several tokens in the air at once, animating
// every node to explain itself would leave something moving somewhere at
// all times, which is the visual clutter this page can least afford. So
// the *form* explains, statically, and the animation budget is spent
// almost entirely on the telemetry passing through. That trade is why
// each of these is a silhouette meant to be readable at a glance and
// never to move.
//
// Shared vocabulary, deliberately narrow so eleven hand-drawn shapes read
// as one set rather than as clip art: a single 1.5px stroke weight, one
// ink-muted color, no fills, and geometric rather than skeuomorphic
// construction (a deadbolt is a rounded rect plus a circle, not a drawing
// of a lock).
//
// Three nodes break that on purpose and say why where they're drawn: the
// parser's black box, and the Lambda and Slack logos. The rule those two
// follow is that a *logo* is reproduced, not redrawn. An approximation of
// a mark everyone recognizes reads as a mistake, not as a house style.

function Device({ eventKey }: { eventKey?: string }) {
  return (
    <>
      {/* A deadbolt throwing into a door frame, and a video doorbell.
          Two silhouettes rather than one generic box, because the
          telemetry came from several device types and two shapes say that
          without a word of copy. */}
      <path d="M -56,-18 L -56,20" />
      {/* Keyed, so React remounts it on every emission and its one-shot
          animation replays. The bolt drawing back and throwing again is
          about the quietest "that device just did something" available:
          a 5px move on a line that's already there, in the corner of
          the diagram that fires most often. */}
      <path key={eventKey} className={styles.deviceEvent} d="M -46,1 L -56,1" />
      <rect x={-46} y={-16} width={28} height={34} rx={7} />
      <circle cx={-32} cy={1} r={6.5} />
      {/* A horizontal slot, not a vertical one: a line through the middle
          of a circle reads as a power symbol. */}
      <path d="M -36,1 L -28,1" />

      <rect x={18} y={-20} width={28} height={42} rx={6} />
      <circle cx={32} cy={-9} r={5} />
      <circle cx={32} cy={9} r={4.5} />
    </>
  )
}

function Condenser() {
  return (
    <>
      {/* A press: two platens with the travel path running between them.
          Compression is the one thing this stop does, and it's also one of
          only two nodes where the number of tokens changes, so the form
          needs to make room for that, literally. */}
      <path d="M -40,-24 L -40,24" />
      <path d="M 40,-24 L 40,24" />
      <rect x={-34} y={-20} width={68} height={11} rx={2} />
      <rect x={-34} y={9} width={68} height={11} rx={2} />
    </>
  )
}

function Kinesis() {
  return (
    <>
      {/* A nozzle that takes telemetry in at the top and delivers it out
          to the right, narrowing as it goes. Narrowing does the work of
          explaining gzip without an icon, and it costs no motion at all.
          A spray effect would have been wrong anyway. Firehose is
          buffered delivery, not spraying. */}
      <path d="M -14,-30 C -14,-4 -6,8 14,8 L 50,8" />
      <path d="M 14,-30 C 14,-18 20,-8 32,-8 L 50,-8" />
    </>
  )
}

function S3Lake() {
  return (
    <>
      {/* An open basin, not a box. This is the only stop that keeps what
          it's given permanently. The DLQ drains and Athena's grid is a
          working set, but files really do stay in the lake, so it is
          drawn as something with a floor that fills up. */}
      <path d="M -56,-20 L -44,-20" />
      <path d="M 44,-20 L 56,-20" />
      <path d="M -56,-20 L -56,26 Q -56,32 -50,32 L 50,32 Q 56,32 56,26 L 56,-20" />
    </>
  )
}

function Sqs() {
  return (
    <>
      {/* A channel with slot dividers, open at both ends: a queue holds
          discrete messages and hands them on in order. Sized for a small
          number of slots on purpose: with the pipeline's real arrival
          rate, drawing five permanently-full slots would be fiction. */}
      <path d="M -46,-14 L 46,-14" />
      <path d="M -46,14 L 46,14" />
      <path d="M -22,-14 L -22,-8" />
      <path d="M -22,14 L -22,8" />
      <path d="M 0,-14 L 0,-8" />
      <path d="M 0,14 L 0,8" />
      <path d="M 22,-14 L 22,-8" />
      <path d="M 22,14 L 22,8" />
    </>
  )
}

function Lambda() {
  // The AWS Lambda lambda. A drawn form here would have to invent a
  // silhouette for "a function runs", and there isn't an honest one. The
  // mark is instantly recognized by exactly the people this page is for.
  // Sits left of centre to leave the file somewhere to be: dead-centre it
  // put an accent token on an accent mark and the two became one blob.
  return (
    <g className={styles.glyphLogo}>
      <path d="M -17,-20 L 3,20" />
      <path d="M -12,-4 L -26,20" />
    </g>
  )
}

function Parser() {
  // A black box in the metaphorical sense, which is the sense that was
  // meant: the one closed, sealed form in a diagram where every other
  // stop is an open one you can see the working of. The hatch says
  // "contents not shown" without painting a literal black rectangle,
  // which read as a hole in the page rather than as a component.
  return (
    <>
      <defs>
        <pattern
          id="parser-hatch"
          width={7}
          height={7}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <path className={styles.hatchLine} d="M 0,0 L 0,7" />
        </pattern>
      </defs>
      <rect
        x={-44}
        y={-22}
        width={88}
        height={44}
        rx={6}
        fill="url(#parser-hatch)"
      />
    </>
  )
}

function Output() {
  return (
    <>
      {/* Another bucket, because that's honestly what it is, but marked
          with vertical stripes, since what lands here is columnar. The
          stripes are also what keeps it from reading as a second data
          lake. */}
      <path d="M -38,-14 L -28,-14" />
      <path d="M 28,-14 L 38,-14" />
      <path d="M -38,-14 L -38,20 Q -38,26 -32,26 L 32,26 Q 38,26 38,20 L 38,-14" />
      <path d="M -14,4 L -14,22" />
      <path d="M 0,4 L 0,22" />
      <path d="M 14,4 L 14,22" />
    </>
  )
}

function Athena() {
  // A grid for results to slot into. Rows and columns, because the whole
  // point of the Parquet output is that it's queryable as a table without
  // a database sitting in front of it.
  const columns = [-46, -22, 2, 26]
  const rows = [-25, -7, 11]
  return (
    <>
      {rows.map((y) =>
        columns.map((x) => (
          <rect key={`${x},${y}`} x={x} y={y} width={20} height={14} rx={2} />
        )),
      )}
    </>
  )
}

function Dlq() {
  return (
    <>
      {/* A bin with compartments rather than the lake's smooth basin: a
          dead-letter queue holds a countable number of specific failed
          messages, and it's meant to be emptied. */}
      <path d="M -32,-24 L -32,24 L 32,24 L 32,-24" />
      <path d="M -32,8 L 32,8" />
      <path d="M -32,-8 L 32,-8" />
    </>
  )
}

function Slack() {
  // The official Slack mark, in Slack's own colors. Its four brand hues
  // are the only colors in this project that aren't derived from the
  // three design tokens. They're deliberately declared here, next to the
  // artwork, rather than in tokens.css: they belong to somebody else's
  // brand and are not part of this site's palette. Drawn from the real
  // eight-path geometry (a 122.8-unit square) rather than approximated,
  // then scaled to a 44px mark.
  return (
    <g transform="translate(-22, -22) scale(0.3583)">
      <path
        fill="#E01E5A"
        d="M 25.8,77.6 c0,7.1 -5.8,12.9 -12.9,12.9 S0,84.7 0,77.6 s5.8,-12.9 12.9,-12.9 h12.9 V77.6z"
      />
      <path
        fill="#E01E5A"
        d="M 32.3,77.6 c0,-7.1 5.8,-12.9 12.9,-12.9 s12.9,5.8 12.9,12.9 v32.3 c0,7.1 -5.8,12.9 -12.9,12.9 s-12.9,-5.8 -12.9,-12.9 V77.6z"
      />
      <path
        fill="#36C5F0"
        d="M 45.2,25.8 c-7.1,0 -12.9,-5.8 -12.9,-12.9 S38.1,0 45.2,0 s12.9,5.8 12.9,12.9 v12.9 H45.2z"
      />
      <path
        fill="#36C5F0"
        d="M 45.2,32.3 c7.1,0 12.9,5.8 12.9,12.9 s-5.8,12.9 -12.9,12.9 H12.9 C5.8,58.1 0,52.3 0,45.2 s5.8,-12.9 12.9,-12.9 H45.2z"
      />
      <path
        fill="#2EB67D"
        d="M 97,45.2 c0,-7.1 5.8,-12.9 12.9,-12.9 s12.9,5.8 12.9,12.9 s-5.8,12.9 -12.9,12.9 H97 V45.2z"
      />
      <path
        fill="#2EB67D"
        d="M 90.5,45.2 c0,7.1 -5.8,12.9 -12.9,12.9 s-12.9,-5.8 -12.9,-12.9 V12.9 C64.7,5.8 70.5,0 77.6,0 s12.9,5.8 12.9,12.9 V45.2z"
      />
      <path
        fill="#ECB22E"
        d="M 77.6,97 c7.1,0 12.9,5.8 12.9,12.9 s-5.8,12.9 -12.9,12.9 s-12.9,-5.8 -12.9,-12.9 V97 H77.6z"
      />
      <path
        fill="#ECB22E"
        d="M 77.6,90.5 c-7.1,0 -12.9,-5.8 -12.9,-12.9 s5.8,-12.9 12.9,-12.9 h32.3 c7.1,0 12.9,5.8 12.9,12.9 s-5.8,12.9 -12.9,12.9 H77.6z"
      />
    </g>
  )
}

const GLYPHS: Record<
  NodeId,
  (props: { eventKey?: string }) => React.JSX.Element
> = {
  device: Device,
  condenser: Condenser,
  kinesis: Kinesis,
  s3lake: S3Lake,
  sqs: Sqs,
  lambda: Lambda,
  parser: Parser,
  output: Output,
  athena: Athena,
  dlq: Dlq,
  slack: Slack,
}

export function NodeGlyph({ id, eventKey }: { id: NodeId; eventKey?: string }) {
  const Glyph = GLYPHS[id]
  // Stroke styling lives on this one wrapper rather than on every path, so
  // the hover/active states can restyle a whole node with one selector.
  return (
    <g className={styles.glyph}>
      <Glyph eventKey={eventKey} />
    </g>
  )
}
