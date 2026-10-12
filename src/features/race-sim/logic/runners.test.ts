import { describe, expect, it } from 'vitest'
import {
  CHECKPOINTS,
  COURSE_VIEWBOX,
  RACE_DISTANCE_MILES,
  courseFraction,
} from './course'
import {
  RACE_DURATION_SECONDS,
  RUNNERS,
  distanceCovered,
  finishSeconds,
  getRunner,
  runnerFraction,
  secondsAtDistance,
} from './runners'

describe('the course', () => {
  it('is far wider than it is tall, so it scrolls in one direction', () => {
    // A roughly square course would need scrolling both ways at once on a
    // phone, which is the thing this shape exists to avoid.
    expect(COURSE_VIEWBOX.width / COURSE_VIEWBOX.height).toBeGreaterThan(2.5)
  })

  it('runs from the start line to the finish', () => {
    expect(CHECKPOINTS.at(0)).toMatchObject({ distanceMiles: 0, kind: 'start' })
    expect(CHECKPOINTS.at(-1)).toMatchObject({
      distanceMiles: RACE_DISTANCE_MILES,
      kind: 'finish',
    })
    expect(CHECKPOINTS.filter((c) => c.kind === 'start')).toHaveLength(1)
    expect(CHECKPOINTS.filter((c) => c.kind === 'finish')).toHaveLength(1)
  })

  it('numbers checkpoints in course order, with distances increasing', () => {
    CHECKPOINTS.forEach((checkpoint, i) => {
      expect(checkpoint.id).toBe(i + 1)
      if (i > 0) {
        expect(checkpoint.distanceMiles).toBeGreaterThan(
          CHECKPOINTS[i - 1]!.distanceMiles,
        )
      }
    })
  })

  it('spaces them unevenly, since a cable goes where the terrain allows', () => {
    const gaps = CHECKPOINTS.slice(1).map(
      (c, i) => c.distanceMiles - CHECKPOINTS[i]!.distanceMiles,
    )

    // Even spacing is the detail that would give away that this is a
    // drawing rather than a course.
    expect(new Set(gaps.map((g) => g.toFixed(2))).size).toBeGreaterThan(5)
  })

  it('maps distance onto the path, clamped at both ends', () => {
    expect(courseFraction(0)).toBe(0)
    expect(courseFraction(RACE_DISTANCE_MILES)).toBe(1)
    expect(courseFraction(RACE_DISTANCE_MILES / 2)).toBeCloseTo(0.5)
    // A runner who has finished stays at the finish rather than running on.
    expect(courseFraction(-5)).toBe(0)
    expect(courseFraction(100)).toBe(1)
  })
})

describe('a runner', () => {
  it('starts at the line and ends at the finish', () => {
    for (const runner of RUNNERS) {
      expect(distanceCovered(runner, 0)).toBe(0)
      expect(distanceCovered(runner, finishSeconds(runner))).toBeCloseTo(
        RACE_DISTANCE_MILES,
      )
    }
  })

  it('never goes backwards', () => {
    for (const runner of RUNNERS) {
      let previous = -1
      for (let t = 0; t <= RACE_DURATION_SECONDS; t += 30) {
        const distance = distanceCovered(runner, t)
        expect(distance).toBeGreaterThanOrEqual(previous)
        previous = distance
      }
    }
  })

  it('stays on the course once finished', () => {
    for (const runner of RUNNERS) {
      const after = finishSeconds(runner) + 3600
      expect(distanceCovered(runner, after)).toBe(RACE_DISTANCE_MILES)
      expect(runnerFraction(runner, after)).toBe(1)
    }
  })

  /* distanceCovered is the inverse of secondsAtDistance, and the two are
     solved separately, so this is the assertion that keeps them honest.
     Everything the diagram draws comes from the first and every crossing
     time comes from the second; if they disagree, a runner visibly passes
     a checkpoint at a different moment from the one their data says. */
  it('is in the same place whichever way round you ask', () => {
    for (const runner of RUNNERS) {
      for (const checkpoint of CHECKPOINTS) {
        const seconds = secondsAtDistance(runner, checkpoint.distanceMiles)
        expect(distanceCovered(runner, seconds)).toBeCloseTo(
          checkpoint.distanceMiles,
          5,
        )
      }
    }
  })

  it('runs a plausible marathon', () => {
    for (const runner of RUNNERS) {
      const minutes = finishSeconds(runner) / 60
      // Between a 2:20 and a 3:30, which is a credible front-of-field spread.
      expect(minutes).toBeGreaterThan(140)
      expect(minutes).toBeLessThan(210)
    }
  })
})

describe('the field as a whole', () => {
  it('has eight runners with distinct bibs', () => {
    expect(RUNNERS).toHaveLength(8)
    expect(new Set(RUNNERS.map((r) => r.bib)).size).toBe(8)
  })

  it('finishes when its last runner does', () => {
    const latest = Math.max(...RUNNERS.map(finishSeconds))
    expect(RACE_DURATION_SECONDS).toBe(latest)
  })

  /* The reason the pacing is authored by hand instead of generated. A race
     where the order never changes has no reason to be animated: a static
     list of finishers would say the same thing. Place and the gap to the
     runner ahead only mean something if they move. */
  it('changes order between halfway and the finish', () => {
    const positionOrder = (t: number) =>
      [...RUNNERS]
        .sort((a, b) => distanceCovered(b, t) - distanceCovered(a, t))
        .map((r) => r.bib)
        .join(',')

    // Final standings come from finish times, not from positions at the
    // end: by then everyone has covered 26.2 and sorting by distance just
    // returns the order they were declared in.
    const finishOrder = [...RUNNERS]
      .sort((a, b) => finishSeconds(a) - finishSeconds(b))
      .map((r) => r.bib)
      .join(',')

    expect(finishOrder).not.toBe(positionOrder(RACE_DURATION_SECONDS / 2))
  })

  it('reels 3701 in with 2884, which is the race it is paced to tell', () => {
    const chaser = getRunner(2884)
    const leader = getRunner(3701)
    const gapAt = (t: number) =>
      distanceCovered(leader, t) - distanceCovered(chaser, t)

    // Ahead at the half, caught by the finish.
    expect(gapAt(secondsAtDistance(leader, 13.1))).toBeGreaterThan(0)
    expect(finishSeconds(chaser)).toBeLessThan(finishSeconds(leader))
  })

  it('does not finish in a dead heat', () => {
    const finishes = RUNNERS.map(finishSeconds)
    expect(new Set(finishes.map((s) => Math.round(s))).size).toBe(
      RUNNERS.length,
    )
  })
})

describe('getRunner', () => {
  it('finds a runner by bib', () => {
    expect(getRunner(2884).bib).toBe(2884)
  })

  it('throws rather than returning nothing for an unknown bib', () => {
    expect(() => getRunner(1)).toThrow('No runner with bib 1')
  })
})
