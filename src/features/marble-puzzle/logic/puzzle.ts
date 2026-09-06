import {
  MARBLE_COUNT,
  MAX_WEIGHINGS,
  type FinalAnswer,
  type GuessOutcome,
  type MarbleId,
  type Pan,
  type PanAssignment,
  type PossibilitySpace,
  type PuzzleState,
  type Weighing,
  type WeighingOutcome,
} from './types'

/** What a balance scale would show if `oddMarbleId` were the odd one out
 * in direction `oddDirection`, for the given pan contents. A weighing's
 * real outcome and a hypothesis's simulated outcome are the same
 * computation. A hypothesis is just a candidate solution. */
function simulateOutcome(
  pans: PanAssignment,
  oddMarbleId: MarbleId,
  oddDirection: 'heavier' | 'lighter',
): WeighingOutcome {
  const inLeft = pans.left.includes(oddMarbleId)
  const inRight = pans.right.includes(oddMarbleId)
  if (!inLeft && !inRight) return 'balanced'
  const oddIsHeavy = oddDirection === 'heavier'
  if (inLeft) return oddIsHeavy ? 'left-heavy' : 'right-heavy'
  return oddIsHeavy ? 'right-heavy' : 'left-heavy'
}

export function createInitialPossibilitySpace(): PossibilitySpace {
  return Array.from({ length: MARBLE_COUNT }, (_, marbleId) => ({
    marbleId,
    possibleAsHeavier: true,
    possibleAsLighter: true,
  }))
}

/** Drops any (marble, direction) hypothesis that wouldn't have produced
 * the weighing's actual outcome. A general constraint filter, not a
 * hand-coded strategy, so it works for any weighing in any order. */
export function narrowPossibilitySpace(
  space: PossibilitySpace,
  weighing: Weighing,
): PossibilitySpace {
  return space.map((hypothesis) => ({
    ...hypothesis,
    possibleAsHeavier:
      hypothesis.possibleAsHeavier &&
      simulateOutcome(weighing, hypothesis.marbleId, 'heavier') ===
        weighing.outcome,
    possibleAsLighter:
      hypothesis.possibleAsLighter &&
      simulateOutcome(weighing, hypothesis.marbleId, 'lighter') ===
        weighing.outcome,
  }))
}

/** Moves a marble onto `pan`, or off the scale entirely if it was already
 * there. A marble is never on both pans at once by construction. */
export function toggleMarblePan(
  assignment: PanAssignment,
  marbleId: MarbleId,
  pan: Pan,
): PanAssignment {
  const wasOnThisPan = assignment[pan].includes(marbleId)
  const left = assignment.left.filter((id) => id !== marbleId)
  const right = assignment.right.filter((id) => id !== marbleId)
  if (wasOnThisPan) return { left, right }
  return pan === 'left'
    ? { left: [...left, marbleId], right }
    : { left, right: [...right, marbleId] }
}

export function submitWeighing(state: PuzzleState): PuzzleState {
  if (state.status !== 'in-progress') {
    throw new Error('Cannot weigh after the puzzle has finished.')
  }
  if (state.weighings.length >= MAX_WEIGHINGS) {
    throw new Error(`Already used the maximum of ${MAX_WEIGHINGS} weighings.`)
  }
  const { left, right } = state.currentAssignment
  if (left.length !== right.length || left.length === 0) {
    throw new Error(
      'Both pans must hold the same number of marbles, at least one each.',
    )
  }

  const outcome = simulateOutcome(
    { left, right },
    state.solution.oddMarbleId,
    state.solution.oddWeight,
  )
  const weighing: Weighing = { left, right, outcome }

  return {
    ...state,
    weighings: [...state.weighings, weighing],
    possibilitySpace: narrowPossibilitySpace(state.possibilitySpace, weighing),
    currentAssignment: { left: [], right: [] },
  }
}

export function submitFinalAnswer(
  state: PuzzleState,
  marbleId: MarbleId,
  weight: 'heavier' | 'lighter',
): PuzzleState {
  if (state.status !== 'in-progress') {
    throw new Error('The puzzle has already finished.')
  }

  const isCorrect =
    marbleId === state.solution.oddMarbleId &&
    weight === state.solution.oddWeight

  const remainingPossibilities = state.possibilitySpace.reduce(
    (count, h) =>
      count + Number(h.possibleAsHeavier) + Number(h.possibleAsLighter),
    0,
  )

  const outcome: GuessOutcome = !isCorrect
    ? 'incorrect'
    : remainingPossibilities <= 1
      ? 'correct-deduced'
      : 'correct-lucky'

  const finalAnswer: FinalAnswer = { marbleId, weight, outcome }

  return { ...state, finalAnswer, status: 'finished' }
}

export function createRandomPuzzle(): PuzzleState {
  return {
    solution: {
      oddMarbleId: Math.floor(Math.random() * MARBLE_COUNT),
      oddWeight: Math.random() < 0.5 ? 'heavier' : 'lighter',
    },
    weighings: [],
    currentAssignment: { left: [], right: [] },
    possibilitySpace: createInitialPossibilitySpace(),
    status: 'in-progress',
  }
}
