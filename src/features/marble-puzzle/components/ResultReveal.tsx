import { MAX_WEIGHINGS } from '../logic/types'
import type { FinalAnswer, GuessOutcome, PuzzleSolution } from '../logic/types'
import styles from './ResultReveal.module.css'

interface ResultRevealProps {
  finalAnswer: FinalAnswer
  solution: PuzzleSolution
  weighingsUsed: number
  onRestart: () => void
}

const headline: Record<GuessOutcome, string> = {
  'correct-deduced': 'Correct — and fully deduced.',
  'correct-lucky': 'Correct — but that was a bit of a guess.',
  incorrect: 'Not quite.',
}

export function ResultReveal({
  finalAnswer,
  solution,
  weighingsUsed,
  onRestart,
}: ResultRevealProps) {
  const solutionText = `Marble ${solution.oddMarbleId + 1} was the odd one out — ${solution.oddWeight}.`

  const body =
    finalAnswer.outcome === 'correct-deduced'
      ? `${solutionText} You had it narrowed to exactly one possibility before you answered.`
      : finalAnswer.outcome === 'correct-lucky'
        ? `${solutionText} More than one marble was still possible given your weighings, so getting it right was as much luck as logic.`
        : `${solutionText} You said marble ${finalAnswer.marbleId + 1} (${finalAnswer.weight}).`

  return (
    <output className={styles.reveal}>
      <h2 className={styles.headline}>{headline[finalAnswer.outcome]}</h2>
      <p>{body}</p>
      <p className={styles.meta}>
        Used {weighingsUsed} of {MAX_WEIGHINGS} weighings.
      </p>
      <button type="button" onClick={onRestart} className={styles.restart}>
        Play again
      </button>
    </output>
  )
}
