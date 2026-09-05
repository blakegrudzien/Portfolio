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
        <p className={styles.meta}>
          © {new Date().getFullYear()} Blake Grudzien ·{' '}
          <a
            href="https://github.com/blakegrudzien/Portfolio"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub
          </a>
        </p>
      </div>
    </footer>
  )
}
