import styles from './Badge.module.css'

export type CaseStudyKind = 'project' | 'experience'

const labels: Record<CaseStudyKind, string> = {
  project: 'Project',
  experience: 'Experience',
}

export function Badge({ kind }: { kind: CaseStudyKind }) {
  return (
    <span className={`${styles.badge} ${styles[kind]}`}>{labels[kind]}</span>
  )
}
