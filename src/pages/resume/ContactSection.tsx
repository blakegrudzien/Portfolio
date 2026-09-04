import styles from './ContactSection.module.css'

export function ContactSection() {
  return (
    <section className={styles.contact}>
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
