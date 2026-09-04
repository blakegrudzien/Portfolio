import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge, type CaseStudyKind } from './Badge'
import styles from './CaseStudyShell.module.css'

interface LinkItem {
  label: string
  href: string
}

interface CaseStudyShellProps {
  kind: CaseStudyKind
  title: string
  dates?: string
  tags?: string[]
  links?: LinkItem[]
  /** Not used until a second entry exists and /projects or /experience
   * becomes a real index page — added now so that migration is a prop,
   * not a shell rewrite. */
  indexLink?: LinkItem
  children?: ReactNode
}

export function CaseStudyShell({
  kind,
  title,
  dates,
  tags,
  links,
  indexLink,
  children,
}: CaseStudyShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        {indexLink && (
          <Link to={indexLink.href} className={styles.indexLink}>
            ← {indexLink.label}
          </Link>
        )}
        <Badge kind={kind} />
        <h1 className={styles.title}>{title}</h1>
        {dates && <p className={styles.dates}>{dates}</p>}
        {tags && tags.length > 0 && (
          <ul className={styles.tags}>
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
        {links && links.length > 0 && (
          <ul className={styles.links}>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </header>
      <div className={styles.sections}>{children}</div>
    </div>
  )
}
