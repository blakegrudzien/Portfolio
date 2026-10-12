import styles from '../../components/case-study/Thumbnail.module.css'

/** What the Brooksee work was, in one small drawing.
 *
 * A course with cables across it, and the watch the numbers ended up on.
 * The full course path would fit here, but on its own it is an outline of a
 * shape rather than a picture of a race: without the wrist at the end of
 * it, nothing says what the project did.
 */
export function RaceThumbnail() {
  return (
    <svg className={styles.thumb} viewBox="0 0 220 130" aria-hidden="true">
      {/* A course, drawn the way the page's own is: straights, corners and
          one bend that was never on a grid. */}
      <path
        className={styles.road}
        d="M 30 74 C 22 50, 40 30, 64 32 L 86 36 C 100 40, 106 56, 100 70 L 92 88 C 86 100, 62 102, 48 94 C 38 88, 32 82, 30 74 Z"
      />

      {/* Timing points, laid across the road. */}
      <path d="M 23 64 L 37 61" />
      <path d="M 62 25 L 66 39" />
      <path d="M 94 60 L 108 64" />
      <path d="M 70 94 L 67 108" />

      {/* A runner on the course, and what reaches their wrist. */}
      <circle className={styles.accentFill} cx={88} cy={38} r={5} />
      <path
        className={styles.accent}
        d="M 116 56 H 138 M 138 56 L 131 52 M 138 56 L 131 60"
      />

      <path d="M 170 26 H 184 V 36" />
      <path d="M 170 102 H 184 V 92" />
      <circle cx={177} cy={64} r={27} />
      <path d="M 204 60 H 209 M 204 70 H 209" />
      <path className={styles.accent} d="M 164 58 H 190" />
      <path d="M 164 70 H 182" />
    </svg>
  )
}
