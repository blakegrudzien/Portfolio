import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.text}>
        © {new Date().getFullYear()} Blake Grudzien ·{' '}
        <a href="https://github.com/blakegrudzien/Portfolio">
          Source on GitHub
        </a>
      </p>
    </footer>
  )
}
