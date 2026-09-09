import { MarblePuzzle } from '../../features/marble-puzzle/components/MarblePuzzle'
import styles from './LabPage.module.css'

export function LabPage() {
  return (
    <div className={styles.page}>
      <h1>The 12 marbles puzzle</h1>
      <p className={`prose ${styles.intro}`}>
        One of these 12 marbles is a different weight than the rest, and you
        don't know which one, or whether it's heavier or lighter. Find it, and
        figure out which, in exactly three weighings on a balance scale. Click a
        marble to place it on the left pan, click again to move it to the right,
        click again to take it off.
      </p>
      <MarblePuzzle />

      {/* Below the puzzle on purpose. Someone who came here to play should
      reach the scale without reading a history first. */}
      <section className={styles.notes}>
        <p>
          My dad first introduced this puzzle to me on a roadtrip when I was
          about nine. I recently found out its roots trace all the way back to
          the Second World War. I really like logic problems, so I wanted to
          make an interactive version of it.
        </p>
        <p>
          It can be done without any guessing, and it can tell if you just got
          lucky or correctly narrowed it down to one marble.
        </p>
      </section>
    </div>
  )
}
