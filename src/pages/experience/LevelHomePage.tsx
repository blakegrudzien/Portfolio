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
          I built this during an in-person internship at Level Home, a then recently acquired company which makes
          smart locks and video doorbells. These devices constantly emit
          telemetry, logs of what the device just did, that the company's firmware team used to troubleshoot bugs
          and catch issues before customers do.
        </p>
        <p>
          At the beginning of my internship, the pipeline that takes this telemetry from a device to a queryable
          table had a real problem: when a file failed to parse, usually because
          firmware added a new event type before the pipeline knew how to read
          it, the pipeline let it fall through, losing it forever. This was happening over 30% of the time. 
        </p>
        <p>
          This project replaced the pipeline with two main goals, a make it more viable for a higher volume of data, 
          and two: the firmware team should be able to adjust the parser and retry failed files very easily. 

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
