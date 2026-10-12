import type { CSSProperties } from 'react'
import styles from '../../components/case-study/Thumbnail.module.css'

/** A clean rounded circuit. Corner radii are equal and the sides are
 * straight, because at this size character reads as wobble: the course with
 * real shape to it is the one on the page. */
const TRACK =
  'M 38 36 H 102 A 18 18 0 0 1 120 54 V 82 A 18 18 0 0 1 102 100 H 38 A 18 18 0 0 1 20 82 V 54 A 18 18 0 0 1 38 36 Z'

/** Timing points, as fractions of the way round.
 *
 * Placed by `offset-distance` rather than by hand, which is the whole
 * difference between this and the version before it: every tick is exactly
 * on the road and exactly square to it, because the browser works out where
 * the road is going and turns the tick to match. Hand-placed, they sat at
 * seven different angles and lengths and read as scribble. */
const TICKS = [12.5, 25, 37.5, 50, 62.5, 75, 87.5]

function at(percent: number): CSSProperties {
  return { '--at': `${percent}%` } as CSSProperties
}

/** What the Brooksee work was, in one small drawing.
 *
 * A course and the watch the numbers ended up on. The course needs the
 * chequered line: a closed shape with ticks on it is a closed shape with
 * ticks, and the start is the one mark that only a race has.
 */
export function RaceThumbnail() {
  return (
    <svg
      className={styles.thumb}
      viewBox="0 0 220 130"
      aria-hidden="true"
      style={{ '--track': `path('${TRACK}')` } as CSSProperties}
    >
      <path className={styles.road} d={TRACK} />

      {TICKS.map((percent) => (
        <g key={percent} className={styles.onTrack} style={at(percent)}>
          <line x1={0} y1={-7} x2={0} y2={7} />
        </g>
      ))}

      {/* Start and finish, laid across the road at the top of the lap. */}
      <g className={styles.onTrack} style={at(0)}>
        {/* Four squares, alternating, spanning the same 14 the ticks do. */}
        {[-7, -3.5, 0, 3.5].map((y, row) => (
          <rect
            key={y}
            className={styles.solid}
            x={row % 2 === 0 ? -3.5 : 0}
            y={y}
            width={3.5}
            height={3.5}
          />
        ))}
        <line className={styles.hairline} x1={0} y1={-7.5} x2={0} y2={7.5} />
      </g>

      {/* The watch. */}
      <path d="M 163 24 H 187 V 40" />
      <path d="M 163 112 H 187 V 96" />
      <circle cx={175} cy={68} r={30} />
      <path d="M 205 61 H 211 M 205 75 H 211" />
      {/* Place rather than the gap to the runner ahead: both came off the
          same ordered list of crossings, but a position is legible without
          being explained and a time difference is not.

          Stacked over two lines, which is what lets the label be spelled
          out at a readable size. On one line it has to choose between
          abbreviating and shrinking, because a dial is at its widest
          across the middle and the label does not sit there. */}
      <text className={styles.capsLabel} x={175} y={57}>
        Current
      </text>
      <text className={styles.capsLabel} x={175} y={67}>
        Place:
      </text>
      <text className={styles.readout} x={175} y={89}>
        2nd
      </text>
    </svg>
  )
}
