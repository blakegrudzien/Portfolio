import { CHECKPOINTS, RACE_DISTANCE_MILES } from './course'
import { RUNNERS, secondsAtDistance } from './runners'

/** One runner crossing one timing point: the record the cable produces and
 * the only thing the system ever actually knows.
 *
 * This is the shape Brooksee's crossings had, minus the fields none of the
 * derivations touched. `todSeconds` stands in for their `tod`, which was a
 * unix timestamp; with a single mass start, seconds since the gun is the
 * same measurement in a more readable unit.
 */
export interface Crossing {
  bib: number
  checkpointId: number
  todSeconds: number
}

/** Every crossing of the whole race, in the order they happen.
 *
 * Precomputed, because pace is authored and so every crossing time is
 * already determined before the race starts. That makes "the log as it
 * stood at time t" a filter rather than accumulated state, which is the
 * difference between this being a pure function and being a thing you have
 * to drive a clock through to test.
 */
export const ALL_CROSSINGS: Crossing[] = RUNNERS.flatMap((runner) =>
  CHECKPOINTS.map((checkpoint) => ({
    bib: runner.bib,
    checkpointId: checkpoint.id,
    todSeconds: secondsAtDistance(runner, checkpoint.distanceMiles),
  })),
).sort((a, b) => a.todSeconds - b.todSeconds)

/** The crossings that have been recorded by `raceSeconds`. Everything a
 * watch could possibly be showing is derived from this and nothing else,
 * which is what makes the data on screen discrete: it changes when a
 * crossing lands, not while a runner is between two of them. */
export function crossingsUpTo(raceSeconds: number): Crossing[] {
  return ALL_CROSSINGS.filter((c) => c.todSeconds <= raceSeconds)
}

/** Everyone who has crossed one timing point, earliest first.
 *
 * The single primitive the derived metrics are built on. Brooksee's
 * database stored crossings and nothing about the relationships between
 * them, so the useful numbers are all questions about where you sit in
 * this list.
 */
export function crossingsAt(checkpointId: number, log: Crossing[]): Crossing[] {
  return log
    .filter((c) => c.checkpointId === checkpointId)
    .sort((a, b) => a.todSeconds - b.todSeconds)
}

/** Which number through a timing point a runner was: their index in the
 * ordered list, from 1. Null at the start line, where every runner has
 * covered nothing and there is nothing to rank.
 *
 * Place came out of Brooksee's database already computed, so the real
 * system read it rather than deriving it. It is derived here because the
 * simulation has no database to read it from, and this is the obvious
 * derivation given what a crossing is. */
export function placeAt(
  bib: number,
  checkpointId: number,
  log: Crossing[],
): number | null {
  const checkpoint = CHECKPOINTS.find((c) => c.id === checkpointId)
  if (!checkpoint || checkpoint.kind === 'start') return null

  const index = crossingsAt(checkpointId, log).findIndex((c) => c.bib === bib)
  return index === -1 ? null : index + 1
}

/** How far behind the runner immediately ahead, in seconds.
 *
 * A port of `fetchFrontGunTime`: take the crossings at my timing point
 * with an earlier time than mine, order them, keep the most recent, and
 * subtract. The answer is a gap in gun time, not an estimate of where
 * anybody is now.
 *
 * Null when leading, or before there is anything to compare against. The
 * original returned 0.0 for the leader, which reads the same as a dead
 * heat; null says the one thing 0 cannot.
 */
export function gapToRunnerAhead(
  bib: number,
  checkpointId: number,
  log: Crossing[],
): number | null {
  const checkpoint = CHECKPOINTS.find((c) => c.id === checkpointId)
  if (!checkpoint || checkpoint.kind === 'start') return null

  const ordered = crossingsAt(checkpointId, log)
  const index = ordered.findIndex((c) => c.bib === bib)
  if (index <= 0) return null

  return ordered[index]!.todSeconds - ordered[index - 1]!.todSeconds
}

/** The most recent timing point a runner has passed. */
export function latestCrossing(
  bib: number,
  log: Crossing[],
): Crossing | undefined {
  return log.filter((c) => c.bib === bib).at(-1)
}

/** What one runner's watch is showing.
 *
 * Every field but the timer is frozen at the runner's last crossing,
 * because that is the last time anything was sent to the watch. A runner
 * two miles past a cable is looking at numbers from two miles ago. The
 * timer is the exception: the watch counts that one itself, so it ticks
 * while everything around it holds, exactly as `RaceView.onUpdate` did.
 *
 * Null means the watch has nothing to show yet and prints "pending",
 * which is the real field's behaviour and not a placeholder for this.
 */
export interface WatchState {
  distanceMiles: number | null
  paceSecPerMile: number | null
  place: number | null
  gapAheadSeconds: number | null
  timeUntilFinishSeconds: number | null
  elapsedSeconds: number
  /** Which crossing the frozen fields came from, so the view can say how
   * old they are rather than presenting them as current. */
  asOfCheckpointId: number | null
}

export function watchState(bib: number, raceSeconds: number): WatchState {
  const elapsedSeconds = Math.max(raceSeconds, 0)
  const log = crossingsUpTo(raceSeconds)
  const crossing = latestCrossing(bib, log)
  const checkpoint = CHECKPOINTS.find((c) => c.id === crossing?.checkpointId)

  if (!crossing || !checkpoint || checkpoint.distanceMiles === 0) {
    return {
      distanceMiles: crossing ? 0 : null,
      paceSecPerMile: null,
      place: null,
      gapAheadSeconds: null,
      timeUntilFinishSeconds: null,
      elapsedSeconds,
      asOfCheckpointId: crossing?.checkpointId ?? null,
    }
  }

  const { distanceMiles } = checkpoint
  const paceSecPerMile = crossing.todSeconds / distanceMiles
  // Brooksee sent a projected finish; the watch showed what was left of it.
  // Straight-line from the pace so far, which is what makes it move around
  // early on and settle as the distance behind it grows.
  const projectedFinishSeconds = paceSecPerMile * RACE_DISTANCE_MILES

  return {
    distanceMiles,
    paceSecPerMile,
    place: placeAt(bib, crossing.checkpointId, log),
    gapAheadSeconds: gapToRunnerAhead(bib, crossing.checkpointId, log),
    timeUntilFinishSeconds: Math.max(
      projectedFinishSeconds - crossing.todSeconds,
      0,
    ),
    elapsedSeconds,
    asOfCheckpointId: crossing.checkpointId,
  }
}

/** Finishing order, for the results the diagram holds on at the end.
 *
 * Read off the finish line's own crossings rather than from how far anyone
 * has run: once the race is over every runner has covered 26.2 miles, so
 * position stops being able to tell them apart.
 */
export function finishOrder(
  log: Crossing[],
): { bib: number; finishSeconds: number }[] {
  const finish = CHECKPOINTS.find((c) => c.kind === 'finish')
  if (!finish) return []

  return crossingsAt(finish.id, log).map((c) => ({
    bib: c.bib,
    finishSeconds: c.todSeconds,
  }))
}
