import { contact } from '../../config/contact'
import styles from './ContactSection.module.css'

export function ContactSection() {
  return (
    <section className={styles.contact}>
      {/* Labelled, because the footer carries email and LinkedIn on every
      page. Without a heading this reads as an accidental repeat rather
      than as the thing you came to this page for. GitHub is the one that
      only appears here. */}
      <h2 className={styles.heading}>Get in touch</h2>
      <ul className={styles.links}>
        <li>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </li>
        <li>
          <a href={contact.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </li>
        <li>
          <a href={contact.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </li>
      </ul>
    </section>
  )
}
