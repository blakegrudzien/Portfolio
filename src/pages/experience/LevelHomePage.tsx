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

      <CaseStudySection heading="Tests & CI">
        <p>
          Every pull request ran the Go test suite with coverage, golangci-lint,
          and govulncheck, plus a container image build to confirm the Lambda
          image still compiled. The deploy pipeline around that belonged to
          another team.
        </p>
        <p>
          What I added was the part that made a failing run readable. A
          coverage-diff step compared the branch against main and commented on
          the pull request with the delta and any new files that came in under
          the threshold, so a change that quietly dropped coverage got named
          before review instead of after. A second step read a failed run and
          posted the actual reason as a comment, rather than leaving whoever
          opened the pull request to go find it in the log.
        </p>
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
