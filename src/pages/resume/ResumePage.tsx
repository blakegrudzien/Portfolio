import { ContactSection } from './ContactSection'
import {
  RESUME_PDF,
  RESUME_PREVIEW,
  RESUME_PREVIEW_HEIGHT,
  RESUME_PREVIEW_WIDTH,
} from './resumePreview'
import styles from './ResumePage.module.css'

export function ResumePage() {
  return (
    <div className={styles.page}>
      <h1>Resume &amp; contact</h1>

      {/* The one place a job search belongs. The rest of the site is a
      personal site and reads like one. */}
      <p className={`prose ${styles.intro}`}>
        I'm looking for backend, platform, and data roles in the Bay Area.
      </p>

      {/* A real PDF rather than the resume re-typed as HTML. Recruiters
      download and print these into applicant systems, and two copies of
      the same content is two things to keep in sync. */}
      <p className={styles.download}>
        <a href={RESUME_PDF} target="_blank" rel="noreferrer">
          Open resume (PDF) →
        </a>
      </p>

      {/* An image of the page rather than the PDF in a frame. A browser's
      built-in viewer wraps the document in its own grey background and
      toolbar, which took up more of the page than the resume did. The link
      above is still the readable, selectable, printable copy; this only
      saves a click for someone who wants to skim it first. Dimensions are
      set so the space is reserved before it loads and nothing shifts. */}
      <a href={RESUME_PDF} target="_blank" rel="noreferrer">
        <img
          className={styles.preview}
          src={RESUME_PREVIEW}
          width={RESUME_PREVIEW_WIDTH}
          height={RESUME_PREVIEW_HEIGHT}
          loading="lazy"
          alt="Preview of Blake Grudzien's one-page resume. The PDF linked above is the readable copy."
        />
      </a>

      <ContactSection />
    </div>
  )
}
