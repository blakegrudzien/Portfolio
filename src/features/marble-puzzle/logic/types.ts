export const MARBLE_COUNT = 12
export const MAX_WEIGHINGS = 3

export type MarbleId = number

export type Pan = 'left' | 'right'

export type WeighingOutcome = 'left-heavy' | 'right-heavy' | 'balanced'

export interface Weighing {
  left: MarbleId[]
  right: MarbleId[]
  outcome: WeighingOutcome
}

export interface PuzzleSolution {
  oddMarbleId: MarbleId
  oddWeight: 'heavier' | 'lighter'
}

/** Whether a given marble could still be the odd one out, in each
 * direction, given every weighing observed so far. */
export interface MarbleHypothesis {
  marbleId: MarbleId
  possibleAsHeavier: boolean
  possibleAsLighter: boolean
}

/** Indexed by marbleId; always has exactly MARBLE_COUNT entries. */
export type PossibilitySpace = MarbleHypothesis[]

export type GuessOutcome = 'correct-deduced' | 'correct-lucky' | 'incorrect'

export interface FinalAnswer {
  marbleId: MarbleId
  weight: 'heavier' | 'lighter'
  outcome: GuessOutcome
}

export interface PanAssignment {
  left: MarbleId[]
  right: MarbleId[]
}

export interface PuzzleState {
  solution: PuzzleSolution
  weighings: Weighing[]
  currentAssignment: PanAssignment
  possibilitySpace: PossibilitySpace
  finalAnswer?: FinalAnswer
  status: 'in-progress' | 'finished'
}
