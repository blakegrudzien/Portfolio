import { CaseStudyShell } from '../../components/case-study/CaseStudyShell'
import { CaseStudySection } from '../../components/case-study/CaseStudySection'
import { PipelineDiagram } from './PipelineDiagram'

export function LevelHomePage() {
  return (
    <CaseStudyShell
      kind="experience"
      title="Level Home"
      dates="May 2025 – September 2025"
      tags={['Go', 'AWS', 'Kinesis Firehose', 'Parquet']}
    >
      <CaseStudySection heading="The problem">
        <p>
          I built this during an in-person internship at Level Home, a then recently
          acquired company in Redwood City that made smart locks and video
          doorbells. These devices constantly emitted telemetry, logs of what
          the device just did, that the company's firmware team used to
          troubleshoot bugs and catch issues before customers did.
        </p>
        <p>
          At the beginning of my internship, the pipeline that took this
          telemetry from a device to a queryable table had a real problem: when
          a file failed to parse, usually because firmware added a new event
          type before the pipeline knew how to read it, the pipeline let it fall
          through, losing it forever. This was happening over 30% of the time.
        </p>
        <p>
          This project replaced the pipeline with two main goals: one, make it
          viable for a higher volume of data; and two, let the firmware team
          adjust the parser and retry failed files easily. By the end of the
          internship, data loss was under 1%.
        </p>
        <p>
          Telling the firmware team a file had failed was part of that second
          goal. I worked back and forth with the firmware team to make a Slack
          bot that would notify them when files failed and let them redrive the
          file from Slack.
        </p>
      </CaseStudySection>

      <CaseStudySection heading="Architecture" prose={false}>
        <PipelineDiagram />
      </CaseStudySection>

      <CaseStudySection heading="Tech stack">
        <p>
          Go · Kinesis Firehose · S3 · SQS (with a native dead-letter queue) ·
          Lambda · Apache Arrow for the Parquet write path · Athena · Slack
          notifications
        </p>
      </CaseStudySection>

      <CaseStudySection heading="Afterward">
        <p>
          I got a return offer at the end of the internship. In June 2026, Assa
          Abloy, which had acquired Level in 2024,{' '}
          <a
            href="https://appleinsider.com/articles/26/06/26/level-lock-team-gutting-leaves-unanswered-questions"
            target="_blank"
            rel="noreferrer"
          >
            laid off most of the company's staff
          </a>{' '}
          and folded it into its Kwikset brand, voiding my return offer a week
          before my start date.
        </p>
      </CaseStudySection>
    </CaseStudyShell>
  )
}
