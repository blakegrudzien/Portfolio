import { describe, expect, it } from 'vitest'
import { CHECKPOINTS, RACE_DISTANCE_MILES } from './course'
import {
  RACE_DURATION_SECONDS,
  RUNNERS,
  distanceCovered,
  getRunner,
  secondsAtDistance,
} from './runners'
import {
  ALL_CROSSINGS,
  crossingsAt,
  crossingsUpTo,
  finishOrder,
  gapToRunnerAhead,
  latestCrossing,
  placeAt,
  watchState,
} from './crossings'

const FINISH = CHECKPOINTS.find((c) => c.kind === 'finish')!
const START = CHECKPOINTS.find((c) => c.kind === 'start')!
/** A split in the second half, where the field is spread out and every
 * runner has crossed several points already. */
const MID = CHECKPOINTS.find((c) => c.distanceMiles === 16.0)!

describe('the crossing log', () => {
  it('records every runner at every timing point, once', () => {
    expect(ALL_CROSSINGS).toHaveLength(RUNNERS.length * CHECKPOINTS.length)

    for (const runner of RUNNERS) {
      const theirs = ALL_CROSSINGS.filter((c) => c.bib === runner.bib)
      expect(theirs).toHaveLength(CHECKPOINTS.length)
      expect(new Set(theirs.map((c) => c.checkpointId)).size).toBe(
        CHECKPOINTS.length,
      )
    }
  })

  it('is ordered by when the crossings happened', () => {
    const times = ALL_CROSSINGS.map((c) => c.todSeconds)
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })

  it('only contains what has happened yet', () => {
    expect(crossingsUpTo(-1)).toEqual([])
    // Everyone is on the start line at the gun and nowhere else.
    expect(crossingsUpTo(0)).toHaveLength(RUNNERS.length)
    expect(crossingsUpTo(RACE_DURATION_SECONDS)).toHaveLength(
      ALL_CROSSINGS.length,
    )
  })

  /* The property the whole diagram rests on. A runner's drawn position
     comes from distanceCovered and their data comes from the log, so if a
     crossing could appear in the log before the runner reached the cable,
     the picture and the numbers would disagree on screen. */
  it('never records a crossing before the runner has run that far', () => {
    for (let t = 0; t <= RACE_DURATION_SECONDS; t += 120) {
      for (const crossing of crossingsUpTo(t)) {
        const checkpoint = CHECKPOINTS.find(
          (c) => c.id === crossing.checkpointId,
        )!
        expect(
          distanceCovered(getRunner(crossing.bib), t),
        ).toBeGreaterThanOrEqual(checkpoint.distanceMiles - 1e-9)
      }
    }
  })
})

describe('place', () => {
  it('is the index through the timing point, from one', () => {
    const log = crossingsUpTo(RACE_DURATION_SECONDS)
    const ordered = crossingsAt(MID.id, log)

    ordered.forEach((crossing, i) => {
      expect(placeAt(crossing.bib, MID.id, log)).toBe(i + 1)
    })
  })

  it('is nothing at the start line, where there is nothing to rank', () => {
    const log = crossingsUpTo(0)
    for (const runner of RUNNERS) {
      expect(placeAt(runner.bib, START.id, log)).toBeNull()
    }
  })

  it('is nothing for a runner who has not reached the point yet', () => {
    const log = crossingsUpTo(0)
    expect(placeAt(RUNNERS[0]!.bib, MID.id, log)).toBeNull()
  })

  it('counts only runners already through, so it can improve as it is read', () => {
    // Place is your position among arrivals so far. Early in a timing
    // point's life the field is still coming through, so the same runner's
    // place at that point is the same number later, but the runners behind
    // them are still being added.
    const leader = crossingsAt(MID.id, ALL_CROSSINGS)[0]!
    const justTheLeader = crossingsUpTo(leader.todSeconds)

    expect(placeAt(leader.bib, MID.id, justTheLeader)).toBe(1)
    expect(crossingsAt(MID.id, justTheLeader)).toHaveLength(1)
    expect(placeAt(leader.bib, MID.id, ALL_CROSSINGS)).toBe(1)
  })
})

describe('the gap to the runner ahead', () => {
  it('is the difference to the previous crossing of the same point', () => {
    const ordered = crossingsAt(MID.id, ALL_CROSSINGS)

    for (let i = 1; i < ordered.length; i++) {
      expect(gapToRunnerAhead(ordered[i]!.bib, MID.id, ALL_CROSSINGS)).toBe(
        ordered[i]!.todSeconds - ordered[i - 1]!.todSeconds,
      )
    }
  })

  it('is nothing for the leader', () => {
    const leader = crossingsAt(MID.id, ALL_CROSSINGS)[0]!
    expect(gapToRunnerAhead(leader.bib, MID.id, ALL_CROSSINGS)).toBeNull()
  })

  it('is always positive, since the list is ordered by time', () => {
    for (const checkpoint of CHECKPOINTS) {
      for (const runner of RUNNERS) {
        const gap = gapToRunnerAhead(runner.bib, checkpoint.id, ALL_CROSSINGS)
        if (gap !== null) expect(gap).toBeGreaterThan(0)
      }
    }
  })

  /* The limitation the page says out loud. The gap is to whoever crossed
     before you, which is not necessarily anyone who is still ahead. */
  it('can name a runner who has since been overtaken', () => {
    const chaser = getRunner(2884)
    const faded = getRunner(3701)
    const atMid = secondsAtDistance(chaser, MID.distanceMiles)

    // 3701 is through this point ahead of 2884, so 2884's watch is
    // measuring against them.
    const ordered = crossingsAt(MID.id, crossingsUpTo(atMid)).map((c) => c.bib)
    expect(ordered.indexOf(faded.bib)).toBeLessThan(ordered.indexOf(chaser.bib))

    // And by the finish, 2884 is ahead of them.
    const order = finishOrder(ALL_CROSSINGS).map((f) => f.bib)
    expect(order.indexOf(chaser.bib)).toBeLessThan(order.indexOf(faded.bib))
  })
})

describe('what a watch is showing', () => {
  it('shows pending for everything before the gun', () => {
    const state = watchState(RUNNERS[0]!.bib, -10)
    expect(state).toMatchObject({
      distanceMiles: null,
      paceSecPerMile: null,
      place: null,
      gapAheadSeconds: null,
      timeUntilFinishSeconds: null,
      asOfCheckpointId: null,
    })
  })

  it('has nothing to derive from the start line but the distance', () => {
    const state = watchState(RUNNERS[0]!.bib, 0)
    expect(state.distanceMiles).toBe(0)
    expect(state.paceSecPerMile).toBeNull()
    expect(state.place).toBeNull()
    expect(state.asOfCheckpointId).toBe(START.id)
  })

  /* The reason the diagram is animated rather than a table. The numbers on
     the wrist come from the last cable, so they hold while the runner keeps
     going and only move when the next one lands. */
  it('holds its values between timing points', () => {
    const runner = getRunner(2884)
    const atMid = secondsAtDistance(runner, MID.distanceMiles)
    const next = CHECKPOINTS.find((c) => c.distanceMiles === 17.3)!
    const justBeforeNext = secondsAtDistance(runner, next.distanceMiles) - 1

    const onArrival = watchState(runner.bib, atMid)
    const muchLater = watchState(runner.bib, justBeforeNext)

    expect(muchLater.distanceMiles).toBe(onArrival.distanceMiles)
    expect(muchLater.paceSecPerMile).toBe(onArrival.paceSecPerMile)
    expect(muchLater.asOfCheckpointId).toBe(MID.id)
    // Meanwhile the runner has really covered more than the watch admits.
    expect(distanceCovered(runner, justBeforeNext)).toBeGreaterThan(
      onArrival.distanceMiles!,
    )
  })

  it('counts the timer itself, so it moves while the rest holds', () => {
    const runner = getRunner(2884)
    const atMid = secondsAtDistance(runner, MID.distanceMiles)

    const onArrival = watchState(runner.bib, atMid)
    const sixtyLater = watchState(runner.bib, atMid + 60)

    expect(sixtyLater.elapsedSeconds - onArrival.elapsedSeconds).toBe(60)
    expect(sixtyLater.asOfCheckpointId).toBe(onArrival.asOfCheckpointId)
  })

  it('reports the pace actually run to the last cable', () => {
    const runner = getRunner(118)
    const atMid = secondsAtDistance(runner, MID.distanceMiles)
    const state = watchState(runner.bib, atMid)

    expect(state.paceSecPerMile).toBeCloseTo(atMid / MID.distanceMiles)
  })

  it('runs its time remaining down to nothing at the finish', () => {
    for (const runner of RUNNERS) {
      const state = watchState(
        runner.bib,
        secondsAtDistance(runner, RACE_DISTANCE_MILES),
      )
      expect(state.asOfCheckpointId).toBe(FINISH.id)
      expect(state.timeUntilFinishSeconds).toBe(0)
      expect(state.distanceMiles).toBe(RACE_DISTANCE_MILES)
    }
  })
})

describe('the finishing order', () => {
  it('comes off the finish line rather than from position', () => {
    const order = finishOrder(ALL_CROSSINGS)

    expect(order).toHaveLength(RUNNERS.length)
    expect(order.map((f) => f.finishSeconds)).toEqual(
      [...order.map((f) => f.finishSeconds)].sort((a, b) => a - b),
    )
    expect(order[0]!.bib).toBe(118)
  })

  it('is empty while nobody has finished', () => {
    expect(finishOrder(crossingsUpTo(60))).toEqual([])
  })

  it('fills up as runners come in', () => {
    const first = finishOrder(ALL_CROSSINGS)[0]!
    expect(finishOrder(crossingsUpTo(first.finishSeconds))).toHaveLength(1)
  })
})

describe('latestCrossing', () => {
  it('is the most recent point a runner has passed', () => {
    const runner = getRunner(905)
    const atMid = secondsAtDistance(runner, MID.distanceMiles)

    expect(latestCrossing(runner.bib, crossingsUpTo(atMid))).toMatchObject({
      bib: runner.bib,
      checkpointId: MID.id,
    })
  })

  it('is nothing before the gun', () => {
    expect(latestCrossing(RUNNERS[0]!.bib, crossingsUpTo(-1))).toBeUndefined()
  })
})
