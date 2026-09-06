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

      {/* Two sentences, and the second one is the hook: what I actually
      did, specific enough to be checked one click away. */}
      <p className={`prose ${styles.intro}`}>
        I'm a recent cs graduate out of Emory University (May 2026) based in the Bay Area. 
        I have two completed software engineering internships, each at startups, focusing on backend and data engineering.  
        
      </p>

      {/* A statement of what exists, not an instruction to read it. The
      reader can decide what they're interested in. */}
      <p className={styles.work}>
        Written up in full: <Link to={paths.projectChessRag}>Chess RAG</Link> ·{' '}
        <Link to={paths.experienceLevelHome}>the Level Home pipeline</Link>
      </p>

      {/* This used to be the About page. It's here instead: the site has
      two case studies carrying the depth, and a separate page for two
      paragraphs was a page to keep current for no gain. */}

      <aside className={styles.aside}>
        <p>
          I like logic puzzles. Here's my version of the {' '}
          <Link to={paths.lab}>twelve-marble weighing problem</Link> if you
          do to.
        </p>
      </aside>
    </div>
  )
}
