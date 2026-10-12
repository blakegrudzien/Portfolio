import type { CSSProperties } from 'react'
import { cx } from '../../../utils/cx'
import {
  CHECKPOINTS,
  COURSE_PATH,
  COURSE_VIEWBOX,
  courseFraction,
} from '../logic/course'
import { RUNNERS } from '../logic/runners'
import styles from './RaceCourse.module.css'

/** Where across the road a runner sits, so two at the same distance are
 * alongside each other instead of stacked. Spread about the centre line
 * and kept inside the road's own width. */
function lane(index: number): number {
  return (index - (RUNNERS.length - 1) / 2) * 2.6
}

/** Position along the course, as the custom property the stylesheet feeds
 * to `offset-distance`. See RaceCourse.module.css for why it travels as a
 * variable rather than as the property itself. */
function at(fraction: number): CSSProperties {
  return { '--at': `${(fraction * 100).toFixed(3)}%` } as CSSProperties
}

interface RaceCourseProps {
  registerRunner: (bib: number, el: SVGGElement | null) => void
  selectedBib: number
}

/** The course and the field on it.
 *
 * Decorative: `aria-hidden`, with no controls of its own. Runners are
 * chosen from the roster beside the watch rather than by clicking a dot,
 * because a dot crossing the screen at this speed is a hostile target with
 * a mouse and close to unusable with a thumb. The roster is eight real
 * buttons that hold still.
 */
export function RaceCourse({ registerRunner, selectedBib }: RaceCourseProps) {
  return (
    <div className={styles.scroll}>
      <div
        className={styles.stage}
        // Declared once and read by every element on the course, so the
        // path the runners follow cannot drift from the one that is drawn.
        style={
          { '--course-offset-path': `path('${COURSE_PATH}')` } as CSSProperties
        }
      >
        <svg
          className={styles.diagram}
          viewBox={`0 0 ${COURSE_VIEWBOX.width} ${COURSE_VIEWBOX.height}`}
          aria-hidden="true"
        >
          <path className={styles.roadEdge} d={COURSE_PATH} />
          <path className={styles.road} d={COURSE_PATH} />

          {CHECKPOINTS.map((checkpoint) => (
            <g
              key={checkpoint.id}
              className={styles.onCourse}
              style={at(courseFraction(checkpoint.distanceMiles))}
            >
              <line
                className={cx(
                  styles.cable,
                  checkpoint.kind === 'start' && styles.cableStart,
                  checkpoint.kind === 'finish' && styles.cableFinish,
                )}
                x1={0}
                y1={-15}
                x2={0}
                y2={15}
              />
            </g>
          ))}

          {RUNNERS.map((runner, index) => (
            // Two nested elements: the group is placed and turned by the
            // course, which makes the circle's own cy an offset across the
            // road rather than down the screen.
            <g
              key={runner.bib}
              ref={(el) => registerRunner(runner.bib, el)}
              className={cx(
                styles.onCourse,
                styles.runner,
                runner.bib === selectedBib && styles.runnerSelected,
              )}
              style={at(0)}
            >
              <circle cy={lane(index)} r={runner.bib === selectedBib ? 7 : 5} />
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
