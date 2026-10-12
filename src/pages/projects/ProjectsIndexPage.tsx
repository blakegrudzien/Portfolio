import { CaseStudyList } from '../../components/case-study/CaseStudyList'
import type { CaseStudySummary } from '../../components/case-study/CaseStudyList'
import { paths } from '../../routes/paths'
import styles from './ProjectsIndexPage.module.css'

const entries: CaseStudySummary[] = [
  {
    to: paths.projectChessScholar,
    kind: 'project',
    title: 'Chess Scholar',
    tags: ['Python', 'PostgreSQL', 'RAG', 'Claude tool-calling'],
    blurb:
      'A chess coach that answers from four backend sources: 127,435 games in SQL, 468,862 chunks of annotated commentary in a vector index, Stockfish for evaluation, and opening matching.',
  },
]

export function ProjectsIndexPage() {
  return (
    <div className={styles.page}>
      <h1>Projects</h1>
      <CaseStudyList entries={entries} />
    </div>
  )
}
