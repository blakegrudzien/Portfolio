import { useReducer, useState } from 'react'
import {
  createRandomPuzzle,
  submitFinalAnswer,
  submitWeighing,
  toggleMarblePan,
} from '../logic/puzzle'
import { MAX_WEIGHINGS } from '../logic/types'
import type { MarbleId, PuzzleState } from '../logic/types'
import { FinalAnswerForm } from './FinalAnswerForm'
import { MarbleTray } from './MarbleTray'
import styles from './MarblePuzzle.module.css'
import { ResultReveal } from './ResultReveal'
import { Scale } from './Scale'
import { WeighingHistory } from './WeighingHistory'

type Action =
  | { type: 'TOGGLE_MARBLE'; marbleId: MarbleId }
  | { type: 'SUBMIT_WEIGHING' }
  | {
      type: 'SUBMIT_FINAL_ANSWER'
      marbleId: MarbleId
      weight: 'heavier' | 'lighter'
    }
  | { type: 'RESTART' }

function puzzleReducer(state: PuzzleState, action: Action): PuzzleState {
  switch (action.type) {
    case 'TOGGLE_MARBLE': {
      // Click cycle: off -> left -> right -> off. If the marble is
      // currently on either pan, toggling 'right' either moves it there
      // (from left) or removes it (from right); if unassigned, 'left'.
      const onScale =
        state.currentAssignment.left.includes(action.marbleId) ||
        state.currentAssignment.right.includes(action.marbleId)
      const targetPan = onScale ? 'right' : 'left'
      return {
        ...state,
        currentAssignment: toggleMarblePan(
          state.currentAssignment,
          action.marbleId,
          targetPan,
        ),
      }
    }
    case 'SUBMIT_WEIGHING':
      return submitWeighing(state)
    case 'SUBMIT_FINAL_ANSWER':
      return submitFinalAnswer(state, action.marbleId, action.weight)
    case 'RESTART':
      return createRandomPuzzle()
  }
}

export function MarblePuzzle() {
  const [state, dispatch] = useReducer(
    puzzleReducer,
    undefined,
    createRandomPuzzle,
  )
  const [mode, setMode] = useState<'easy' | 'hard'>('hard')

  const weighingsLeft = MAX_WEIGHINGS - state.weighings.length
  const canWeighMore = state.status === 'in-progress' && weighingsLeft > 0
  const { left, right } = state.currentAssignment
  const hasActiveAssignment = left.length > 0 || right.length > 0
  const lastWeighing = state.weighings.at(-1)
  const canSubmitWeighing =
    canWeighMore && left.length === right.length && left.length > 0

  const scaleProps =
    hasActiveAssignment || !lastWeighing
      ? { left, right, result: undefined }
      : {
          left: lastWeighing.left,
          right: lastWeighing.right,
          result: lastWeighing.outcome,
        }

  return (
    <div className={styles.puzzle}>
      <div
        className={styles.modeToggle}
        role="radiogroup"
        aria-label="Difficulty"
      >
        <label>
          <input
            type="radio"
            name="mode"
            checked={mode === 'hard'}
            onChange={() => setMode('hard')}
          />
          Hard — no visual hints
        </label>
        <label>
          <input
            type="radio"
            name="mode"
            checked={mode === 'easy'}
            onChange={() => setMode('easy')}
          />
          Easy — fade out ruled-out marbles
        </label>
      </div>

      <Scale {...scaleProps} />

      <p className={styles.budget}>
        {state.status === 'in-progress'
          ? `${weighingsLeft} of ${MAX_WEIGHINGS} weighings left`
          : null}
      </p>

      <MarbleTray
        assignment={state.currentAssignment}
        possibilitySpace={state.possibilitySpace}
        showEliminated={mode === 'easy'}
        disabled={!canWeighMore}
        onToggle={(marbleId) => dispatch({ type: 'TOGGLE_MARBLE', marbleId })}
      />

      {canWeighMore && (
        <button
          type="button"
          className={styles.weighButton}
          disabled={!canSubmitWeighing}
          onClick={() => dispatch({ type: 'SUBMIT_WEIGHING' })}
        >
          Weigh
        </button>
      )}

      <WeighingHistory weighings={state.weighings} />

      {state.status === 'in-progress' && (
        <FinalAnswerForm
          onSubmit={(marbleId, weight) =>
            dispatch({ type: 'SUBMIT_FINAL_ANSWER', marbleId, weight })
          }
        />
      )}

      {state.status === 'finished' && state.finalAnswer && (
        <ResultReveal
          finalAnswer={state.finalAnswer}
          solution={state.solution}
          weighingsUsed={state.weighings.length}
          onRestart={() => dispatch({ type: 'RESTART' })}
        />
      )}
    </div>
  )
}
