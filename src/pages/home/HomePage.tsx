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
        I'm a backend engineer in the Bay Area, out of Emory as of May 2026.
        Last summer I rebuilt a telemetry pipeline at Level Home so that files
        which failed to parse stopped getting deleted.
      </p>

      <Link to={paths.projectChessRag} className={styles.cta}>
        Read the Chess RAG case study →
      </Link>

      {/* This used to be the About page. It's here instead: the site has
      two case studies carrying the depth, and a separate page for three
      paragraphs was a page to keep current for no gain. */}
      <div className={`prose ${styles.body}`}>
        <p>
          Commits stay small enough to review in one sitting, and I'd rather
          lose an afternoon figuring out why something actually failed than
          patch around it and move on. On that pipeline it meant building a
          Slack bot for the firmware team, hearing it was more than they needed,
          and cutting it down to a daily digest instead of shipping what I'd
          already built.
        </p>
        <p>
          I'm looking for backend, platform, and data work. I'm comfortable at
          the other end of it too, sitting with whoever has the problem and
          working out what would actually solve it.
        </p>
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
