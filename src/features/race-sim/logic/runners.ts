import { RACE_DISTANCE_MILES, courseFraction } from './course'

/** A runner's pace over one stretch of the course, in seconds per mile,
 * applying from the previous segment's end up to `throughMile`. */
export interface PaceSegment {
  throughMile: number
  paceSecPerMile: number
}

export interface Runner {
  /** Bib number. Runners are bibs rather than invented names: a bib is what
   * a timing system actually knows about a person, and naming eight
   * fictional people would be inventing more than this needs. */
  bib: number
  segments: PaceSegment[]
}

/** Eight runners, paced by hand.
 *
 * Authored rather than generated, and deliberately not random. A fixed
 * race can be tuned until something worth watching happens in it, and it
 * can be tested: the positions swapping at mile 20 is an assertion, not a
 * thing that might occur on this page load. The Level Home diagram
 * randomises its traffic because any file will do there; here the point is
 * these specific runners catching each other.
 *
 * The shape of the pacing is the familiar one: nearly everybody goes out
 * faster than they can hold, and the race is decided by who fades least.
 * 3701 and 2884 are the two whose order changes in the last few miles.
 */
export const RUNNERS: Runner[] = [
  {
    bib: 118,
    segments: [
      { throughMile: 13.1, paceSecPerMile: 352 },
      { throughMile: 21.0, paceSecPerMile: 364 },
      { throughMile: RACE_DISTANCE_MILES, paceSecPerMile: 379 },
    ],
  },
  {
    bib: 3701,
    // Goes out hardest and pays the most for it.
    segments: [
      { throughMile: 10.2, paceSecPerMile: 346 },
      { throughMile: 20.5, paceSecPerMile: 372 },
      { throughMile: RACE_DISTANCE_MILES, paceSecPerMile: 425 },
    ],
  },
  {
    bib: 2884,
    // Even, and reels 3701 in over the last five miles.
    segments: [{ throughMile: RACE_DISTANCE_MILES, paceSecPerMile: 371 }],
  },
  {
    bib: 905,
    segments: [
      { throughMile: 16.0, paceSecPerMile: 386 },
      { throughMile: RACE_DISTANCE_MILES, paceSecPerMile: 398 },
    ],
  },
  {
    bib: 4412,
    segments: [
      { throughMile: 6.4, paceSecPerMile: 374 },
      { throughMile: 18.9, paceSecPerMile: 395 },
      { throughMile: RACE_DISTANCE_MILES, paceSecPerMile: 421 },
    ],
  },
  {
    bib: 1530,
    segments: [
      { throughMile: 13.1, paceSecPerMile: 404 },
      { throughMile: RACE_DISTANCE_MILES, paceSecPerMile: 409 },
    ],
  },
  {
    bib: 2267,
    segments: [
      { throughMile: 11.5, paceSecPerMile: 418 },
      { throughMile: 23.4, paceSecPerMile: 433 },
      { throughMile: RACE_DISTANCE_MILES, paceSecPerMile: 448 },
    ],
  },
  {
    bib: 657,
    segments: [
      { throughMile: 20.5, paceSecPerMile: 437 },
      { throughMile: RACE_DISTANCE_MILES, paceSecPerMile: 462 },
    ],
  },
]

export function getRunner(bib: number): Runner {
  const runner = RUNNERS.find((r) => r.bib === bib)
  if (!runner) throw new Error(`No runner with bib ${bib}`)
  return runner
}

/** Seconds elapsed at the point a runner reaches `distanceMiles`.
 *
 * Walks the pace segments and accumulates. Paces are real seconds per
 * mile, so every time this produces is a plausible marathon time and the
 * watch can display it without conversion. How fast the diagram plays
 * those seconds back is the view's business, not this file's.
 */
export function secondsAtDistance(
  runner: Runner,
  distanceMiles: number,
): number {
  const target = Math.min(Math.max(distanceMiles, 0), RACE_DISTANCE_MILES)
  let seconds = 0
  let from = 0

  for (const segment of runner.segments) {
    const to = Math.min(segment.throughMile, target)
    if (to > from) seconds += (to - from) * segment.paceSecPerMile
    from = segment.throughMile
    if (from >= target) break
  }
  return seconds
}

/** When this runner crosses the finish. */
export function finishSeconds(runner: Runner): number {
  return secondsAtDistance(runner, RACE_DISTANCE_MILES)
}

/** How far a runner has run at `raceSeconds`.
 *
 * The inverse of secondsAtDistance, solved segment by segment rather than
 * by search, because pace is constant within a segment so the distance
 * covered inside one is just time over pace. Everything the diagram draws
 * and every crossing it records comes from this one function, which is
 * what keeps a runner's drawn position and their timing data from being
 * able to disagree.
 */
export function distanceCovered(runner: Runner, raceSeconds: number): number {
  if (raceSeconds <= 0) return 0
  let remaining = raceSeconds
  let distance = 0

  for (const segment of runner.segments) {
    const segmentMiles = segment.throughMile - distance
    if (segmentMiles <= 0) continue
    const segmentSeconds = segmentMiles * segment.paceSecPerMile

    if (remaining < segmentSeconds) {
      return distance + remaining / segment.paceSecPerMile
    }
    remaining -= segmentSeconds
    distance = segment.throughMile
  }
  return RACE_DISTANCE_MILES
}

/** Where to draw a runner, as a fraction of the course path. */
export function runnerFraction(runner: Runner, raceSeconds: number): number {
  return courseFraction(distanceCovered(runner, raceSeconds))
}

/** When the last runner finishes, which is when the race is over and the
 * diagram holds on its results. */
export const RACE_DURATION_SECONDS = Math.max(...RUNNERS.map(finishSeconds))
