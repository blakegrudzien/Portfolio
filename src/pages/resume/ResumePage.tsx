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
      personal site and reads like one.

      The gap between graduating and now gets answered here rather than
      only on the Level Home page, where it is the last paragraph of the
      last section. This is the page someone opens to work out whether to
      get in touch, so it is where the question actually comes up, and
      leaving it to be discovered two clicks deep reads worse than the
      answer does. */}
      <div className={`prose ${styles.intro}`}>
        <p>
          I'm looking for backend, platform, and data roles in the Bay Area.
          Available now, and authorized to work in the US.
        </p>
        <p>
          I was on track to return to Level Home full time. In June 2026, ASSA
          ABLOY{' '}
          <a
            href="https://appleinsider.com/articles/26/06/26/level-lock-team-gutting-leaves-unanswered-questions"
            target="_blank"
            rel="noreferrer"
          >
            laid off most of the company
          </a>{' '}
          and voided my offer a week before my start date. I've been building
          and interviewing since.
        </p>
      </div>

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
      set so the space is reserved before it loads and nothing shifts.

      Dropped entirely on a narrow screen, link and all, rather than just
      the image: an anchor whose only content is hidden is an empty link
      that still takes a tab stop and announces nothing. */}
      <a
        className={styles.previewLink}
        href={RESUME_PDF}
        target="_blank"
        rel="noreferrer"
      >
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
