import { Link } from 'react-router'
import { paths } from '../../routes/paths'
import styles from './HomePage.module.css'

export function HomePage() {
  return (
    <main id="main-content" className={styles.page}>
      <p className={styles.eyebrow}>
        Solutions Engineer · Backend · Data Engineer · FDE
      </p>
      <h1>Blake Grudzien</h1>
      <p className={`prose ${styles.intro}`}>
        CS at Emory (math minor, May 2026), based in the Bay Area. This site is
        a working example of how I build — start with the Chess RAG case study
        below to see the reasoning behind it, not just the result.
      </p>
      <Link to={paths.projectChessRag} className={styles.cta}>
        Read the Chess RAG case study →
      </Link>
    </main>
  )
}
