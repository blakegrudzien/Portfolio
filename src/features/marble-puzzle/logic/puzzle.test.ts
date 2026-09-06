import { describe, expect, it } from 'vitest'
import {
  createInitialPossibilitySpace,
  narrowPossibilitySpace,
  submitFinalAnswer,
  submitWeighing,
  toggleMarblePan,
} from './puzzle'
import type { PuzzleSolution, PuzzleState, Weighing } from './types'

function buildState(
  solution: PuzzleSolution,
  overrides: Partial<PuzzleState> = {},
): PuzzleState {
  return {
    solution,
    weighings: [],
    currentAssignment: { left: [], right: [] },
    possibilitySpace: createInitialPossibilitySpace(),
    status: 'in-progress',
    ...overrides,
  }
}

describe('narrowPossibilitySpace', () => {
  it('eliminates hypotheses for marbles not on the scale when the outcome is imbalanced', () => {
    const weighing: Weighing = {
      left: [0, 1],
      right: [2, 3],
      outcome: 'left-heavy',
    }
    const next = narrowPossibilitySpace(
      createInitialPossibilitySpace(),
      weighing,
    )

    for (const hypothesis of next) {
      if (hypothesis.marbleId >= 4) {
        expect(hypothesis.possibleAsHeavier).toBe(false)
        expect(hypothesis.possibleAsLighter).toBe(false)
      }
    }
  })

  it('eliminates hypotheses for marbles on the scale when the outcome is balanced', () => {
    const weighing: Weighing = {
      left: [0, 1],
      right: [2, 3],
      outcome: 'balanced',
    }
    const next = narrowPossibilitySpace(
      createInitialPossibilitySpace(),
      weighing,
    )

    for (const hypothesis of next) {
      const onScale = [0, 1, 2, 3].includes(hypothesis.marbleId)
      expect(hypothesis.possibleAsHeavier).toBe(!onScale)
      expect(hypothesis.possibleAsLighter).toBe(!onScale)
    }
  })

  it('keeps only the correctly-signed on-scale hypotheses when imbalanced', () => {
    const weighing: Weighing = {
      left: [0, 1],
      right: [2, 3],
      outcome: 'left-heavy',
    }
    const next = narrowPossibilitySpace(
      createInitialPossibilitySpace(),
      weighing,
    )
    const byId = (id: number) => next.find((h) => h.marbleId === id)!

    expect(byId(0)).toMatchObject({
      possibleAsHeavier: true,
      possibleAsLighter: false,
    })
    expect(byId(1)).toMatchObject({
      possibleAsHeavier: true,
      possibleAsLighter: false,
    })
    expect(byId(2)).toMatchObject({
      possibleAsHeavier: false,
      possibleAsLighter: true,
    })
    expect(byId(3)).toMatchObject({
      possibleAsHeavier: false,
      possibleAsLighter: true,
    })
  })
})

describe('toggleMarblePan', () => {
  it('adds an unassigned marble to a pan', () => {
    expect(toggleMarblePan({ left: [], right: [] }, 5, 'left')).toEqual({
      left: [5],
      right: [],
    })
  })

  it('removes a marble when toggled on the pan it is already on', () => {
    expect(toggleMarblePan({ left: [5], right: [] }, 5, 'left')).toEqual({
      left: [],
      right: [],
    })
  })

  it('moves a marble from one pan to the other', () => {
    const result = toggleMarblePan({ left: [5], right: [] }, 5, 'right')
    expect(result.left).not.toContain(5)
    expect(result.right).toContain(5)
  })
})

describe('submitWeighing', () => {
  it('derives the outcome from the hidden solution and narrows the space', () => {
    const state = buildState(
      { oddMarbleId: 5, oddWeight: 'heavier' },
      { currentAssignment: { left: [0, 1, 2, 3, 4], right: [5, 6, 7, 8, 9] } },
    )
    const next = submitWeighing(state)

    expect(next.weighings).toHaveLength(1)
    expect(next.weighings[0]!.outcome).toBe('right-heavy')
    expect(next.currentAssignment).toEqual({ left: [], right: [] })
  })

  it('rejects unequal pan sizes', () => {
    const state = buildState(
      { oddMarbleId: 0, oddWeight: 'heavier' },
      { currentAssignment: { left: [0, 1], right: [2] } },
    )
    expect(() => submitWeighing(state)).toThrow()
  })

  it('rejects empty pans', () => {
    const state = buildState({ oddMarbleId: 0, oddWeight: 'heavier' })
    expect(() => submitWeighing(state)).toThrow()
  })

  it('rejects a fourth weighing', () => {
    let state = buildState(
      { oddMarbleId: 0, oddWeight: 'heavier' },
      { currentAssignment: { left: [0], right: [1] } },
    )
    for (let i = 0; i < 3; i++) {
      state = submitWeighing({
        ...state,
        currentAssignment: { left: [0], right: [1] },
      })
    }
    state = { ...state, currentAssignment: { left: [0], right: [1] } }
    expect(() => submitWeighing(state)).toThrow()
  })

  it('rejects weighing after the puzzle has finished', () => {
    let state = buildState({ oddMarbleId: 0, oddWeight: 'heavier' })
    state = submitFinalAnswer(state, 0, 'heavier')
    state = { ...state, currentAssignment: { left: [0], right: [1] } }
    expect(() => submitWeighing(state)).toThrow()
  })
})

describe('submitFinalAnswer', () => {
  const solution: PuzzleSolution = { oddMarbleId: 5, oddWeight: 'heavier' }

  it('marks a correct guess as correct-lucky when multiple hypotheses remain', () => {
    // No weighings done, so all 24 hypotheses are still open.
    const result = submitFinalAnswer(buildState(solution), 5, 'heavier')
    expect(result.finalAnswer?.outcome).toBe('correct-lucky')
  })

  it('marks a wrong marble as incorrect', () => {
    const result = submitFinalAnswer(buildState(solution), 6, 'heavier')
    expect(result.finalAnswer?.outcome).toBe('incorrect')
  })

  it('marks the right marble but wrong direction as incorrect', () => {
    const result = submitFinalAnswer(buildState(solution), 5, 'lighter')
    expect(result.finalAnswer?.outcome).toBe('incorrect')
  })

  it('rejects answering after the puzzle has already finished', () => {
    const finished = submitFinalAnswer(buildState(solution), 5, 'heavier')
    expect(() => submitFinalAnswer(finished, 5, 'heavier')).toThrow()
  })
})

describe('a full three-weighing game', () => {
  // Hand-verified for this specific hidden solution (marble 5, heavier).
  // not the globally optimal strategy, just one concrete, checked path
  // that exercises narrowing across three real weighings end to end.
  it('collapses the possibility space to exactly the true odd marble', () => {
    const solution: PuzzleSolution = { oddMarbleId: 5, oddWeight: 'heavier' }
    let state = buildState(solution)

    state = submitWeighing({
      ...state,
      currentAssignment: { left: [0, 1, 2, 3, 4], right: [5, 6, 7, 8, 9] },
    })
    expect(state.weighings[0]!.outcome).toBe('right-heavy')

    state = submitWeighing({
      ...state,
      currentAssignment: { left: [5, 6], right: [7, 8] },
    })
    expect(state.weighings[1]!.outcome).toBe('left-heavy')

    state = submitWeighing({
      ...state,
      currentAssignment: { left: [5], right: [6] },
    })
    expect(state.weighings[2]!.outcome).toBe('left-heavy')

    const stillPossible = state.possibilitySpace.filter(
      (h) => h.possibleAsHeavier || h.possibleAsLighter,
    )
    expect(stillPossible).toEqual([
      { marbleId: 5, possibleAsHeavier: true, possibleAsLighter: false },
    ])

    const result = submitFinalAnswer(state, 5, 'heavier')
    expect(result.finalAnswer?.outcome).toBe('correct-deduced')
  })
})
