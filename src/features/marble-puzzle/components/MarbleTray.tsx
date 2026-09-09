import { hypothesisState } from '../logic/puzzle'
import { MARBLE_COUNT } from '../logic/types'
import type {
  HypothesisState,
  MarbleId,
  PanAssignment,
  PossibilitySpace,
} from '../logic/types'
import { cx } from '../../../utils/cx'
import styles from './MarbleTray.module.css'

interface MarbleTrayProps {
  assignment: PanAssignment
  possibilitySpace: PossibilitySpace
  /** Easy mode: show what the weighings so far have settled about each
   * marble. Ruled-out marbles fade, and a marble that can only be the
   * heavy one or only the light one is tinted and badged. */
  showHints: boolean
  disabled: boolean
  onToggle: (marbleId: MarbleId) => void
}

function describeAssignment(assignment: PanAssignment, marbleId: MarbleId) {
  if (assignment.left.includes(marbleId)) return 'left pan'
  if (assignment.right.includes(marbleId)) return 'right pan'
  return 'not on the scale'
}

/** Spoken form of each hint. The tint and the badge are visual only, so
 * without these the whole of easy mode would be invisible to a screen
 * reader. */
const HINT_LABEL: Record<Exclude<HypothesisState, 'unknown'>, string> = {
  'ruled-out': 'ruled out',
  'must-be-heavier': 'if it is the odd one, it is heavier',
  'must-be-lighter': 'if it is the odd one, it is lighter',
}

export function MarbleTray({
  assignment,
  possibilitySpace,
  showHints,
  disabled,
  onToggle,
}: MarbleTrayProps) {
  return (
    <fieldset className={styles.tray}>
      <legend className="visually-hidden">Marbles</legend>
      {Array.from({ length: MARBLE_COUNT }, (_, marbleId) => {
        const hypothesis = possibilitySpace.find((h) => h.marbleId === marbleId)
        const hint =
          showHints && hypothesis ? hypothesisState(hypothesis) : 'unknown'
        const onLeft = assignment.left.includes(marbleId)
        const onRight = assignment.right.includes(marbleId)
        const label = [
          `Marble ${marbleId + 1}`,
          describeAssignment(assignment, marbleId),
          hint === 'unknown' ? null : HINT_LABEL[hint],
        ]
          .filter(Boolean)
          .join(', ')

        return (
          <button
            key={marbleId}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(marbleId)}
            className={cx(
              styles.marble,
              onLeft && styles.onLeft,
              onRight && styles.onRight,
              hint === 'ruled-out' && styles.eliminated,
              hint === 'must-be-heavier' && styles.heavier,
              hint === 'must-be-lighter' && styles.lighter,
            )}
            aria-label={label}
          >
            {marbleId + 1}
          </button>
        )
      })}
    </fieldset>
  )
}
