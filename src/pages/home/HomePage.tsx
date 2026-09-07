import { Link } from 'react-router'
import { paths } from '../../routes/paths'
import styles from './HomePage.module.css'

/**
 * Cropped square, so it can be rendered as a circle without cutting into
 * the face. Served at 400px for a 160px slot, which covers 2x displays.
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
            width={400}
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
        I'm a recent CS graduate out of Emory University (May 2026) based in the
        Bay Area. I have two completed software engineering internships, each at
        startups, focusing on backend and data engineering.
      </p>

      <p className={styles.work}>
        Written up in full:{' '}
        <Link to={paths.projectChessScholar}>Chess Scholar</Link> ·{' '}
        <Link to={paths.experienceLevelHome}>the Level Home pipeline</Link>
      </p>

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
