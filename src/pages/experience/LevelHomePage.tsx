import { CaseStudyShell } from '../../components/case-study/CaseStudyShell'
import { CaseStudySection } from '../../components/case-study/CaseStudySection'
import { PipelineDiagram } from './PipelineDiagram'

export function LevelHomePage() {
  return (
    <CaseStudyShell
      kind="experience"
      // TODO: fill in the actual dates, e.g. "Summer 2025 · in-person
      // internship". Left off rather than guessed at.
      title="Level Home"
      tags={['Go', 'AWS', 'Kinesis Firehose', 'Parquet']}
    >
      <CaseStudySection heading="The problem">
        <p>
          I built this during an in-person internship at Level Home, which makes
          smart locks, doorbells, and bridges. Those devices constantly emit
          telemetry, logs of what the device just did, used to monitor products
          and catch issues before customers do.
        </p>
        <p>
          The pipeline that gets that telemetry from a device to a queryable
          table had a real problem: when a file failed to parse, usually because
          firmware added a new event type before the pipeline knew how to read
          it, the pipeline just deleted it. That data was gone, permanently, the
          moment it failed.
        </p>
        <p>
          This project replaced deletion with something closer to purgatory. A
          failed file lands in a dead-letter queue instead of disappearing, the
          firmware team gets notified, and once the parser understands the new
          event type the file gets redriven, pulled back out of the queue and
          reprocessed, rather than lost.
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
    </CaseStudyShell>
  )
}
