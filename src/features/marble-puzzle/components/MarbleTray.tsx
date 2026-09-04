import { MARBLE_COUNT } from '../logic/types'
import type { MarbleId, PanAssignment, PossibilitySpace } from '../logic/types'
import { cx } from '../../../utils/cx'
import styles from './MarbleTray.module.css'

interface MarbleTrayProps {
  assignment: PanAssignment
  possibilitySpace: PossibilitySpace
  /** Easy mode: fade out marbles that have been fully ruled out. */
  showEliminated: boolean
  disabled: boolean
  onToggle: (marbleId: MarbleId) => void
}

function describeAssignment(assignment: PanAssignment, marbleId: MarbleId) {
  if (assignment.left.includes(marbleId)) return 'left pan'
  if (assignment.right.includes(marbleId)) return 'right pan'
  return 'not on the scale'
}

export function MarbleTray({
  assignment,
  possibilitySpace,
  showEliminated,
  disabled,
  onToggle,
}: MarbleTrayProps) {
  return (
    <fieldset className={styles.tray}>
      <legend className="visually-hidden">Marbles</legend>
      {Array.from({ length: MARBLE_COUNT }, (_, marbleId) => {
        const hypothesis = possibilitySpace.find((h) => h.marbleId === marbleId)
        const isEliminated =
          showEliminated &&
          hypothesis !== undefined &&
          !hypothesis.possibleAsHeavier &&
          !hypothesis.possibleAsLighter
        const onLeft = assignment.left.includes(marbleId)
        const onRight = assignment.right.includes(marbleId)

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
              isEliminated && styles.eliminated,
            )}
            aria-label={`Marble ${marbleId + 1}, ${describeAssignment(assignment, marbleId)}`}
          >
            {marbleId + 1}
          </button>
        )
      })}
    </fieldset>
  )
}
