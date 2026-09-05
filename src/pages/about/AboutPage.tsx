import { Link } from 'react-router'
import { paths } from '../../routes/paths'
import styles from './AboutPage.module.css'

export function AboutPage() {
  return (
    <div className={styles.page}>
      <h1>About</h1>
      <div className={`prose ${styles.body}`}>
        <p>
          I study computer science at Emory, with a math minor, and finish in
          May 2026. Both case studies here come from the same instinct: I want
          to understand a system well enough to defend every decision in it, and
          this site is built so a reader can check that instinct instead of
          taking my word for it.
        </p>
        <p>
          That shows up in how I work. Commits stay small enough to review in
          one sitting, and I'd rather lose an afternoon figuring out why
          something actually failed than patch around it and move on. On the
          Level Home pipeline that meant building a Slack bot for the firmware
          team, hearing it was more than they needed, and cutting it down to a
          daily digest instead of shipping what I'd already built.
        </p>
        <p>
          I like being close to both ends of a system: the part a person
          actually touches, and the infrastructure holding it up underneath.
          Most of what I've built sits underneath, and backend, platform, and
          data roles are what I'm looking for. I'm comfortable at the other end
          too, sitting with whoever has the problem and working out what would
          actually solve it. Explaining a system clearly is most of that job,
          and it's the same skill these case studies are built on.
        </p>
        {/* TODO: this page is still being designed. Open questions: one more
        paragraph with something specific about Blake outside the job search
        (an interest, a habit, whatever's actually true) rather than generic
        filler, and whether the "albums on rotation" idea lands as a live
        Spotify pull or a hand-maintained list. Left out on purpose for now.
        Inventing one would be worse than leaving it blank. */}
      </div>

      <aside className={styles.aside}>
        <p>
          I like puzzles. There's a{' '}
          <Link to={paths.lab}>twelve-marble weighing problem</Link> here if you
          want one.
        </p>
      </aside>
    </div>
  )
}
