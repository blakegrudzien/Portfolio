import { cx } from '../../../utils/cx'
import { CHECKPOINTS } from '../logic/course'
import type { WatchState } from '../logic/crossings'
import { gap, miles, minuteSeconds, place, raceClock } from '../logic/format'
import styles from './RunnerWatch.module.css'

/** The gun, as a time of day. Only used to print a clock in the corner the
 * way the watch's own activity screen does. */
const GUN_HOUR = 7

function timeOfDay(elapsedSeconds: number): string {
  const total = GUN_HOUR * 3600 + Math.max(elapsedSeconds, 0)
  const hour24 = Math.floor(total / 3600) % 24
  const minute = Math.floor((total % 3600) / 60)
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour}:${String(minute).padStart(2, '0')}${hour24 < 12 ? 'am' : 'pm'}`
}

/** The six values the field settled on.
 *
 * Laid out as cells because that is how a Garmin activity screen reads: a
 * big number with a small label under it, repeated in a grid. The labels
 * are short for the same reason they were short on the watch, which is
 * that there is no room for anything else.
 */
function cells(watch: WatchState) {
  return [
    { label: 'PACE', value: minuteSeconds(watch.paceSecPerMile) },
    { label: 'DIST', value: miles(watch.distanceMiles) },
    { label: 'PLACE', value: place(watch.place) },
    { label: 'GAP AHEAD', value: gap(watch.gapAheadSeconds, watch.place) },
    { label: 'TO GO', value: raceClock(watch.timeUntilFinishSeconds) },
    {
      label: 'TIMER',
      value: raceClock(watch.elapsedSeconds),
      /** The only one the watch works out for itself, so the only one that
       * moves between timing points. Marked so that is visible rather than
       * something you have to be told. */
      live: true,
    },
  ]
}

export function RunnerWatch({
  bib,
  watch,
}: {
  bib: number
  watch: WatchState
}) {
  const asOf = CHECKPOINTS.find((c) => c.id === watch.asOfCheckpointId)

  return (
    <figure className={styles.watch}>
      <div className={styles.device}>
        <div className={cx(styles.strap, styles.strapTop)} />

        <div className={styles.case}>
          {/* Five of them, as a Forerunner has: two left, three right. */}
          {[
            styles.buttonLeftUpper,
            styles.buttonLeftLower,
            styles.buttonRightUpper,
            styles.buttonRightMiddle,
            styles.buttonRightLower,
          ].map((position) => (
            <span key={position} className={cx(styles.button, position)} />
          ))}
          <span className={styles.wordmark}>GARMIN</span>

          <div className={styles.screen}>
            {/* The watch's own chrome, top and bottom. A data field does not
                get the whole screen; it gets the middle. */}
            <p className={styles.clock}>{timeOfDay(watch.elapsedSeconds)}</p>

            <div className={styles.grid}>
              {cells(watch).map(({ label, value, live }) => (
                <div
                  key={label}
                  className={cx(styles.cell, live && styles.cellLive)}
                >
                  <span
                    className={cx(
                      styles.value,
                      // "pending" and "leading" are words, and do not fit a
                      // cell at the size a number is set in.
                      !/\d/.test(value) && styles.valueWord,
                    )}
                  >
                    {value}
                  </span>
                  <span className={styles.label}>{label}</span>
                </div>
              ))}
            </div>

            {/* Directly under the values it qualifies, and across the
                widest part of the glass. Not on the real watch: the field
                had no way to say how old its numbers were, which is one of
                the limitations the page names. */}
            <p className={styles.asOf}>
              {asOf && asOf.distanceMiles > 0
                ? `last cable \u00b7 mi ${miles(asOf.distanceMiles)}`
                : 'no cable yet'}
            </p>

            <p className={styles.foot}>#{bib}</p>
          </div>
        </div>

        <div className={cx(styles.strap, styles.strapBottom)} />
      </div>

      <figcaption className={styles.caption}>
        One Connect IQ data field filling the activity screen. Every value but
        the timer is frozen at the last cable this runner crossed.
      </figcaption>
    </figure>
  )
}
