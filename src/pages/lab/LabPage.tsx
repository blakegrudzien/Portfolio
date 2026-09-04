import { MarblePuzzle } from '../../features/marble-puzzle/components/MarblePuzzle'
import styles from './LabPage.module.css'

export function LabPage() {
  return (
    <div className={styles.page}>
      <h1>The 12 marbles puzzle</h1>
      <p className={`prose ${styles.intro}`}>
        One of these 12 marbles is a different weight than the rest — you don't
        know which one, or whether it's heavier or lighter. Find it, and figure
        out which, in exactly three weighings on a balance scale. Click a marble
        to place it on the left pan, click again to move it to the right, click
        again to take it off.
      </p>
      <MarblePuzzle />
    </div>
  )
}
