import type { MarbleId, WeighingOutcome } from '../logic/types'
import styles from './Scale.module.css'

interface ScaleProps {
  left: MarbleId[]
  right: MarbleId[]
  /** Undefined means "not weighed yet". The beam stays level even if
   * marbles are already placed, since placing marbles shouldn't itself
   * reveal anything about their true weight. */
  result?: WeighingOutcome
}

const resultLabel: Record<WeighingOutcome, string> = {
  'left-heavy': 'Left pan is heavier',
  'right-heavy': 'Right pan is heavier',
  balanced: 'Balanced',
}

export function Scale({ left, right, result }: ScaleProps) {
  // Clockwise rotation tips the right end down, counterclockwise tips the
  // left end down. This is the one place that sign matters and is easy
  // to get backwards, so it's spelled out rather than left implicit.
  const tiltClass =
    result === 'left-heavy'
      ? styles.tiltLeft
      : result === 'right-heavy'
        ? styles.tiltRight
        : ''

  const statusText = result
    ? resultLabel[result]
    : left.length === 0 && right.length === 0
      ? 'Nothing on the scale yet'
      : 'Not weighed yet'

  return (
    <div className={styles.wrapper}>
      <div className={styles.fulcrum} />
      <div className={`${styles.beam} ${tiltClass}`}>
        <div className={styles.pan}>
          {left.map((id) => (
            <span key={id} className={styles.dot} />
          ))}
        </div>
        <div className={`${styles.pan} ${styles.panRight}`}>
          {right.map((id) => (
            <span key={id} className={styles.dot} />
          ))}
        </div>
      </div>
      <p className={styles.status} aria-live="polite">
        {statusText}
      </p>
    </div>
  )
}
