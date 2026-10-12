import { useState } from 'react'
import { cx } from '../../../utils/cx'
import { CHECKPOINTS } from '../logic/course'
import { crossingsUpTo, placeAt, watchState } from '../logic/crossings'
import { place as formatPlace } from '../logic/format'
import { RUNNERS } from '../logic/runners'
import { useRaceClock } from '../useRaceClock'
import { Propagation } from './Propagation'
import { RaceCourse } from './RaceCourse'
import { RunnerWatch } from './RunnerWatch'
import styles from './RaceSimulation.module.css'

/** Selected when the page opens.
 *
 * Something has to be, or a visitor arrives to a swarm of dots, an empty
 * watch and nothing saying that any of it is theirs to poke at. Not a
 * protagonist: every runner is selectable and this one is only the one
 * already chosen. It is the runner who gets caught in the last five miles,
 * so whoever leaves it alone still sees something happen.
 */
const DEFAULT_BIB = 3701

export function RaceSimulation() {
  const { registerRunner, phase, restart, isStill, displaySeconds } =
    useRaceClock()
  const [selectedBib, setSelectedBib] = useState(DEFAULT_BIB)

  const log = crossingsUpTo(displaySeconds)
  const watch = watchState(selectedBib, displaySeconds)

  /** Each runner's place at the last timing point they crossed, which is
   * the only place anybody actually knows. There is no live ranking in
   * this system and there was none in the real one. */
  const standings = RUNNERS.map((runner) => {
    const state = watchState(runner.bib, displaySeconds)
    return {
      bib: runner.bib,
      place: state.asOfCheckpointId
        ? placeAt(runner.bib, state.asOfCheckpointId, log)
        : null,
      atMile: state.distanceMiles,
    }
  })

  return (
    <div className={styles.simulation}>
      <RaceCourse registerRunner={registerRunner} selectedBib={selectedBib} />

      <p className={styles.scrollHint}>
        Scroll the course sideways to follow the whole race.
      </p>

      <Propagation
        bib={selectedBib}
        checkpointId={watch.asOfCheckpointId}
        animate={!isStill}
      />

      <div className={styles.controls}>
        {!isStill && (
          <button type="button" className={styles.restart} onClick={restart}>
            Restart the race
          </button>
        )}
        <p className={styles.status}>
          {isStill
            ? 'Motion is off, so the field is shown partway through the race.'
            : phase === 'holding'
              ? 'Everyone is in. The race starts again shortly.'
              : `${RUNNERS.length} runners, ${CHECKPOINTS.length} timing points. A real course can carry a hundred.`}
        </p>
      </div>

      <div className={styles.inspect}>
        <fieldset className={styles.roster}>
          <legend className={styles.rosterLegend}>Pick a runner</legend>
          {standings.map(({ bib, place, atMile }) => (
            <button
              key={bib}
              type="button"
              className={cx(
                styles.rosterRow,
                bib === selectedBib && styles.rosterRowSelected,
              )}
              aria-pressed={bib === selectedBib}
              onClick={() => setSelectedBib(bib)}
            >
              <span className={styles.rosterBib}>{bib}</span>
              <span className={styles.rosterPlace}>
                {place === null ? '—' : formatPlace(place)}
              </span>
              <span className={styles.rosterMile}>
                {atMile === null ? '' : `mi ${atMile.toFixed(1)}`}
              </span>
            </button>
          ))}
        </fieldset>

        <RunnerWatch bib={selectedBib} watch={watch} />
      </div>
    </div>
  )
}
