import { CaseStudyShell } from '../../components/case-study/CaseStudyShell'
import { CaseStudySection } from '../../components/case-study/CaseStudySection'
import { PipelineDiagram } from './PipelineDiagram'

export function LevelHomePage() {
  return (
    <CaseStudyShell kind="experience" title="Level Home">
      <CaseStudySection heading="The problem">
        <p>
          Level Home's smart locks, doorbells, and bridges constantly emit
          telemetry — logs of what the device just did, used to monitor products
          and catch issues before customers do. The pipeline that gets that
          telemetry from a device to a queryable table had a real problem: when
          a file failed to parse — usually because firmware added a new event
          type before the pipeline knew how to read it — the pipeline just
          deleted it. That data was gone, permanently, the moment it failed.
        </p>
        <p>
          This project replaced deletion with something closer to purgatory: a
          failed file lands in a dead-letter queue instead of disappearing, the
          firmware team gets notified, and once the parser understands the new
          event type, the file gets redriven — pulled back out of the queue and
          reprocessed — rather than lost. The diagram below is that pipeline,
          live: add a piece of telemetry and watch it move through it, including
          what happens when it fails.
        </p>
      </CaseStudySection>

      <CaseStudySection heading="Architecture" prose={false}>
        <PipelineDiagram />
      </CaseStudySection>
    </CaseStudyShell>
  )
}
