import { ContactSection } from './ContactSection'
import styles from './ResumePage.module.css'

/**
 * Put the PDF in `public/` and point this at it, e.g.
 * '/blake-grudzien-resume.pdf'. While it's empty the download button is
 * left out entirely rather than shipping a link that 404s.
 */
const RESUME_PDF = ''

export function ResumePage() {
  return (
    <div className={styles.page}>
      <h1>Resume &amp; contact</h1>

      <p className={`prose ${styles.intro}`}>
        The short version is on this site: the{' '}
        <a href="/projects/chess-rag">Chess RAG case study</a> and the{' '}
        <a href="/experience/level-home">Level Home pipeline</a> are the two
        pieces of work worth reading in full. The resume covers the rest.
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
