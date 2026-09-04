import type { ReactNode } from 'react'
import styles from './CaseStudySection.module.css'

interface CaseStudySectionProps {
  heading: string
  /** Set false for sections whose content isn't paragraph prose (e.g. an
   * interactive diagram), so it isn't measure-constrained like body text. */
  prose?: boolean
  children: ReactNode
}

export function CaseStudySection({
  heading,
  prose = true,
  children,
}: CaseStudySectionProps) {
  return (
    <section className={styles.section}>
      <h2>{heading}</h2>
      {prose ? <div className="prose">{children}</div> : children}
    </section>
  )
}
