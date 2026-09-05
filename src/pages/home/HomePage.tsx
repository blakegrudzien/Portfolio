import { Link } from 'react-router'
import { paths } from '../../routes/paths'
import styles from './HomePage.module.css'

/**
 * Point this at the real photo when it's ready (put the file in `public/`
 * and set the path here, e.g. '/blake.jpg'). While it's empty the header
 * reserves the same space and draws a placeholder, so the layout doesn't
 * shift when the photo lands. Replace before this goes anywhere public.
 */
const PHOTO_SRC = ''

export function HomePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {PHOTO_SRC ? (
          <img
            className={styles.photo}
            src={PHOTO_SRC}
            alt="Blake Grudzien"
            width={160}
            height={160}
          />
        ) : (
          <div className={styles.photoPlaceholder}>
            <span>Photo</span>
          </div>
        )}

        <div className={styles.identity}>
          <h1>Blake Grudzien</h1>
          {/* Location first: it's the thing a recruiter filters on before
          they read anything else, so it shouldn't be buried in prose. */}
          <p className={styles.eyebrow}>Bay Area · Backend · Platform · Data</p>
        </div>
      </div>

      <p className={`prose ${styles.intro}`}>
        CS at Emory, math minor, graduating May 2026. This site is a working
        example of how I build. Start with the Chess RAG case study below to see
        the reasoning behind it, not just the result.
      </p>

      <Link to={paths.projectChessRag} className={styles.cta}>
        Read the Chess RAG case study →
      </Link>
    </div>
  )
}
