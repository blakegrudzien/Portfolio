import styles from '../../components/case-study/Thumbnail.module.css'

/** What the Level Home work was, in one small drawing.
 *
 * Not a reduction of the page's diagram. That diagram is 1200 by 574 with
 * eleven illustrated nodes, and at the width of an index entry every one of
 * them is a dot: it came out looking like a tree, which is what a pipeline
 * looks like with the pipeline taken out of it.
 *
 * So it draws the input instead. A lock and a doorbell, both reporting,
 * their streams joining into one. Telemetry is the word the page leans on
 * and a device with signal arcs coming off it is the only way to say it in
 * a picture this size. What happened to the files that would not parse is
 * left to the writing, because two ideas do not fit in 15rem.
 */
export function PipelineThumbnail() {
  return (
    <svg className={styles.thumb} viewBox="0 0 220 130" aria-hidden="true">
      {/* A smart lock. */}
      <rect x={18} y={20} width={30} height={27} rx={4} />
      <path d="M 25 20 V 13 A 8 8 0 0 1 41 13 V 20" />
      <circle className={styles.solid} cx={33} cy={33} r={3} />

      {/* A video doorbell. */}
      <rect x={18} y={80} width={30} height={34} rx={4} />
      <circle cx={33} cy={92} r={5} />
      <circle className={styles.solid} cx={33} cy={106} r={3} />

      {/* Both of them reporting. */}
      <path className={styles.accent} d="M 56 26 A 14 14 0 0 1 56 44" />
      <path className={styles.accent} d="M 56 88 A 14 14 0 0 1 56 106" />

      {/* Into one stream of files. */}
      <path className={styles.faint} d="M 68 35 C 92 35, 92 66, 112 66" />
      <path className={styles.faint} d="M 68 97 C 92 97, 92 66, 112 66" />
      <path className={styles.road} d="M 112 66 H 206" />
      <rect x={124} y={58} width={15} height={16} rx={2} />
      <rect x={150} y={58} width={15} height={16} rx={2} />
      <rect x={176} y={58} width={15} height={16} rx={2} />
    </svg>
  )
}
