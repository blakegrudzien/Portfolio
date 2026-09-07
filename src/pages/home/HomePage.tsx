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
