import styles from '../../components/case-study/Thumbnail.module.css'
import { cx } from '../../utils/cx'

/** What the Level Home work was, in one small drawing.
 *
 * Not a reduction of the page's diagram. That diagram is 1200 by 574 with
 * eleven illustrated nodes, and at the width of an index entry every one of
 * them is a dot: it came out looking like a tree, which is what a pipeline
 * looks like when you take the pipeline out of it. So this draws the
 * argument instead of the layout. Files move through, one fails and drops
 * into a queue rather than being lost, and an arrow takes it back round.
 * That is the whole case study.
 */
export function PipelineThumbnail() {
  return (
    <svg className={styles.thumb} viewBox="0 0 220 130" aria-hidden="true">
      <path className={styles.pipe} d="M 16 40 H 204" />

      {/* Telemetry on its way through. */}
      {[26, 58, 90].map((x) => (
        <rect key={x} x={x} y={32} width={16} height={16} rx={2} />
      ))}

      {/* The one that will not parse, carrying the notch the full diagram
          marks a bad file with. */}
      <path d="M 122 32 H 132 L 138 38 V 48 H 122 Z" />
      <path d="M 132 32 V 38 H 138" />

      {/* Out of the flow and into the dead-letter queue, which is a bin with
          compartments in the full diagram too. */}
      <path className={styles.accent} d="M 140 52 C 150 62, 150 64, 150 70" />
      <path d="M 124 74 V 108 H 190 V 74" />
      <path d="M 124 88 H 190" />
      <rect
        className={styles.solid}
        x={132}
        y={94}
        width={14}
        height={10}
        rx={1}
      />
      <rect
        className={styles.solid}
        x={152}
        y={94}
        width={14}
        height={10}
        rx={1}
      />

      {/* Redriven: the parser gets fixed and the backlog goes round again. */}
      <path className={styles.accent} d="M 194 92 C 214 84, 214 46, 188 40" />
      <path
        className={cx(styles.accent)}
        d="M 188 40 L 197 36 M 188 40 L 194 47"
      />
    </svg>
  )
}
