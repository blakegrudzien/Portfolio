import { Link } from 'react-router'
import { paths } from '../../routes/paths'
import styles from './HomePage.module.css'

/**
 * The ellipse mask is baked into the image, so no border-radius is applied
 * in CSS. Served at 400px tall for a 160px slot, covering 2x displays.
 */
const PHOTO_SRC = '/headshot.webp'

export function HomePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {PHOTO_SRC ? (
          <img
            className={styles.photo}
            src={PHOTO_SRC}
            alt="Blake Grudzien"
            width={345}
            height={400}
          />
        ) : (
          <div className={styles.photoPlaceholder}>
            <span>Photo</span>
          </div>
        )}

        <div className={styles.identity}>
          <h1>Blake Grudzien</h1>
          <p className={styles.eyebrow}>Bay Area · Backend · Platform · Data</p>
        </div>
      </div>

      <p className={`prose ${styles.intro}`}>
        I'm a recent CS graduate from Emory, May 2026. Both of my software
        engineering internships were at startups, building backend services and
        data pipelines. I'm looking for backend, platform, and data roles.
      </p>

      <h2 className={styles.workHeading}>Written up in full</h2>
      <ul className={styles.work}>
        <li>
          <Link to={paths.experienceLevelHome} className={styles.workTitle}>
            Level Home
          </Link>
          <p className={styles.workBlurb}>
            Rebuilt a device telemetry pipeline in Go so failed files could be
            fixed and retried instead of lost. Data loss went from over 30% to
            under 1%.
          </p>
        </li>
        <li>
          <Link to={paths.projectChessScholar} className={styles.workTitle}>
            Chess Scholar
          </Link>
          <p className={styles.workBlurb}>
            A chess coach that answers from four backend sources: 127,435 games
            in SQL, 468,862 chunks of annotated commentary in a vector index,
            Stockfish for evaluation, and opening matching.
          </p>
        </li>
      </ul>

      <aside className={styles.aside}>
        <p>
          I like logic puzzles. Here's my version of the{' '}
          <Link to={paths.lab}>twelve-marble weighing problem</Link> if you do
          too.
        </p>
      </aside>
    </div>
  )
}
