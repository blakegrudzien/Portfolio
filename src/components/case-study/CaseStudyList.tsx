import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge, type CaseStudyKind } from './Badge'
import styles from './CaseStudyList.module.css'

export interface CaseStudySummary {
  to: string
  kind: CaseStudyKind
  title: string
  dates?: string
  tags?: string[]
  /** One or two sentences. Enough to choose between entries, not a summary
   * of the page: anything worth reading twice belongs on the page itself. */
  blurb: string
  /** A still reduction of whatever the page's diagram is. Decorative, and
   * not a link of its own: the title beside it already goes there, and a
   * second link to the same place is a second stop for anyone tabbing. */
  thumbnail?: ReactNode
}

/** An index of case studies, shared by /experience and /projects so the
 * two read as the same kind of page. */
export function CaseStudyList({ entries }: { entries: CaseStudySummary[] }) {
  return (
    <ul className={styles.list}>
      {entries.map((entry) => (
        <li key={entry.to} className={styles.entry}>
          {entry.thumbnail && (
            <div className={styles.thumbnail}>{entry.thumbnail}</div>
          )}
          <div className={styles.body}>
            <Badge kind={entry.kind} />
            <h2 className={styles.title}>
              <Link to={entry.to}>{entry.title}</Link>
            </h2>
            {entry.dates && <p className={styles.dates}>{entry.dates}</p>}
            <p className={styles.blurb}>{entry.blurb}</p>
            {entry.tags && entry.tags.length > 0 && (
              <ul className={styles.tags}>
                {entry.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
