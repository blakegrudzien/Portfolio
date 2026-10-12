import type { CSSProperties } from 'react'
import styles from './Propagation.module.css'

/** Trimmed to the drawing, for the same reason the course's is: the glyphs
 * sit between y 24 and y 109, and the rightmost caption runs a few units
 * past 620, so a box of 0 0 620 128 both padded the top and clipped the
 * end of "the field redraws". */
const VIEWBOX = { x: 0, y: 18, width: 636, height: 97 }

/** The line every crossing travels to reach a wrist.
 *
 * Drawn rather than listed, in the same register as the Level Home diagram:
 * one stroke weight, no fills, labels under the artwork. The phone is a hop
 * because it has to be. A Garmin mid-race has no route to Firestore of its
 * own, so the listener runs on a phone in the runner's pocket and forwards
 * each update over Bluetooth, which is the reason this was three codebases
 * instead of one.
 */
const HOPS = [
  { id: 'cable', x: 70, label: 'Cable', detail: 'records a crossing' },
  { id: 'firestore', x: 237, label: 'Firestore', detail: 'the record lands' },
  { id: 'phone', x: 404, label: 'Phone', detail: 'derives the numbers' },
  { id: 'watch', x: 571, label: 'Watch', detail: 'the field redraws' },
]

const ROW_Y = 46
/** Half the width of a glyph, so edges stop short of the artwork instead of
 * running underneath it. */
const GLYPH_RADIUS = 26

function CableGlyph() {
  return (
    <>
      {/* A road, with the cable laid across it. */}
      <path d="M -22 -13 H 22" />
      <path d="M -22 13 H 22" />
      <path d="M 0 -19 V 19" />
      <path d="M -4 -22 H 4" />
      <path d="M -4 22 H 4" />
    </>
  )
}

function FirestoreGlyph() {
  return (
    <>
      {/* Stacked layers: the shape every document store is drawn with, and
          close to how Firestore's own icon reads. */}
      <path d="M -16 -11 L 0 -19 L 16 -11 L 0 -3 Z" />
      <path d="M -16 0 L 0 8 L 16 0" />
      <path d="M -16 10 L 0 18 L 16 10" />
    </>
  )
}

function PhoneGlyph() {
  return (
    <>
      <rect x={-13} y={-21} width={26} height={42} rx={4} />
      <path d="M -5 -16 H 5" />
      <path d="M -6 15 H 6" />
    </>
  )
}

function WatchGlyph() {
  return (
    <>
      {/* The same device the panel above draws, at a size where only the
          case, the strap and one button survive. */}
      <path d="M -7 -21 H 7 V -15" />
      <path d="M -7 21 H 7 V 15" />
      <circle cx={0} cy={0} r={15} />
      <path d="M 15 -5 H 18" />
      <path d="M 15 5 H 18" />
    </>
  )
}

const GLYPHS: Record<string, () => React.JSX.Element> = {
  cable: CableGlyph,
  firestore: FirestoreGlyph,
  phone: PhoneGlyph,
  watch: WatchGlyph,
}

/** The line the travelling record follows, straight through every hop. */
const WIRE = `M ${HOPS[0]!.x} ${ROW_Y} H ${HOPS.at(-1)!.x}`

export function Propagation({
  bib,
  checkpointId,
  animate,
}: {
  bib: number
  /** The timing point the selected runner last crossed. Changing it is what
   * sets a record off down the line. */
  checkpointId: number | null
  animate: boolean
}) {
  return (
    <div className={styles.propagation}>
      <svg
        className={styles.diagram}
        viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`}
        aria-hidden="true"
        style={{ '--wire': `path('${WIRE}')` } as CSSProperties}
      >
        {HOPS.slice(0, -1).map((hop, i) => (
          <path
            key={hop.id}
            className={styles.edge}
            d={`M ${hop.x + GLYPH_RADIUS} ${ROW_Y} H ${HOPS[i + 1]!.x - GLYPH_RADIUS}`}
          />
        ))}

        {HOPS.map((hop) => {
          const Glyph = GLYPHS[hop.id]!
          return (
            <g key={hop.id}>
              <g
                className={styles.glyph}
                transform={`translate(${hop.x}, ${ROW_Y})`}
              >
                <Glyph />
              </g>
              <text className={styles.label} x={hop.x} y={ROW_Y + 44}>
                {hop.label}
              </text>
              <text className={styles.detail} x={hop.x} y={ROW_Y + 60}>
                {hop.detail}
              </text>
            </g>
          )
        })}

        {/* Keyed on the crossing, so React replaces the element and the
            animation runs from the start each time the selected runner
            passes a cable. Cheaper and far less fragile than resetting a
            transition by hand, which the Level Home diagram has to do
            because its tokens must survive between hops. */}
        {animate && checkpointId !== null && (
          <rect
            key={`${bib}-${checkpointId}`}
            className={styles.record}
            x={-7}
            y={-5}
            width={14}
            height={10}
            rx={2}
          />
        )}
      </svg>
    </div>
  )
}
