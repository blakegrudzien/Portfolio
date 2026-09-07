import { ContactSection } from './ContactSection'
import styles from './ResumePage.module.css'

const RESUME_PDF = '/Blake_Grudzien_Resume.pdf'

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
      {RESUME_PDF && (
        <p className={styles.download}>
          <a href={RESUME_PDF} target="_blank" rel="noreferrer">
            View resume (PDF) →
          </a>
        </p>
      )}

      <ContactSection />
    </div>
  )
}
