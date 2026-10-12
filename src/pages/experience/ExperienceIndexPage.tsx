import { CaseStudyList } from '../../components/case-study/CaseStudyList'
import type { CaseStudySummary } from '../../components/case-study/CaseStudyList'
import { paths } from '../../routes/paths'
import { PipelineThumbnail } from './PipelineThumbnail'
import { RaceThumbnail } from './RaceThumbnail'
import styles from './ExperienceIndexPage.module.css'

const entries: CaseStudySummary[] = [
  {
    to: paths.experienceLevelHome,
    kind: 'experience',
    title: 'Level Home',
    dates: 'May 2025 – September 2025',
    tags: ['Go', 'AWS Lambda', 'Kinesis', 'Parquet'],
    blurb:
      'Rebuilt a device telemetry pipeline in Go so files that failed to parse could be fixed and retried instead of lost. Data loss went from over 30% to under 1%.',
    thumbnail: <PipelineThumbnail />,
  },
  {
    to: paths.experienceBrooksee,
    kind: 'experience',
    title: 'Brooksee',
    dates: 'June 2024 – October 2024',
    tags: ['Monkey C', 'Kotlin', 'Firestore', 'Connect IQ'],
    blurb:
      'Put live race data on marathon runners’ watches. The gap to the runner ahead and a gun-synced clock are not stored anywhere; both are queries over timing-point crossings, carried to the wrist by way of a phone in the runner’s pocket.',
    thumbnail: <RaceThumbnail />,
  },
]

export function ExperienceIndexPage() {
  return (
    <div className={styles.page}>
      <h1>Experience</h1>
      <p className={`prose ${styles.intro}`}>
        Both of my software engineering internships were at startups. Each one
        is written up in full rather than summarised.
      </p>
      <CaseStudyList entries={entries} />
    </div>
  )
}
