import styles from './ContactSection.module.css'

export function ContactSection() {
  return (
    <section className={styles.contact}>
      {/* Labelled, because the footer carries the same two links on every
      page. Without a heading this reads as an accidental repeat rather
      than as the thing you came to this page for. */}
      <h2 className={styles.heading}>Get in touch</h2>
      <ul className={styles.links}>
        <li>
          <a href="mailto:blakegrudzien@gmail.com">blakegrudzien@gmail.com</a>
        </li>
        <li>
          <a
            href="https://github.com/blakegrudzien"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </li>
      </ul>
    </section>
  )
}
