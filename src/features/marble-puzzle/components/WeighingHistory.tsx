import type { Weighing, WeighingOutcome } from '../logic/types'
import styles from './WeighingHistory.module.css'

const outcomeLabel: Record<WeighingOutcome, string> = {
  'left-heavy': 'left heavier',
  'right-heavy': 'right heavier',
  balanced: 'balanced',
}

function formatPan(marbleIds: number[]) {
  return marbleIds.map((id) => id + 1).join(', ')
}

export function WeighingHistory({ weighings }: { weighings: Weighing[] }) {
  if (weighings.length === 0) return null

  return (
    <ol className={styles.list}>
      {weighings.map((weighing, index) => (
        <li key={index} className={styles.item}>
          <span className={styles.index}>#{index + 1}</span>
          {formatPan(weighing.left)} vs {formatPan(weighing.right)} →{' '}
          <strong>{outcomeLabel[weighing.outcome]}</strong>
        </li>
      ))}
    </ol>
  )
}
