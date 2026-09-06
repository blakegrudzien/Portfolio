import { contact } from '../../config/contact'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* Contact lives here rather than only on the resume page: a
        recruiter shouldn't have to navigate anywhere to find an email
        address, and this is the one element on every page. */}
        <ul className={styles.contact}>
          <li>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </li>
          <li>
            <a href={contact.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </li>
        </ul>
        <p className={styles.meta}>
          © {new Date().getFullYear()} Blake Grudzien ·{' '}
          <a href={contact.sourceRepo} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </p>
      </div>
    </footer>
  )
}
