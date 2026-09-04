import { CaseStudyShell } from '../../components/case-study/CaseStudyShell'
import { CaseStudySection } from '../../components/case-study/CaseStudySection'
import { PipelineDiagram } from './PipelineDiagram'

export function LevelHomePage() {
  return (
    <CaseStudyShell kind="experience" title="Level Home">
      <CaseStudySection heading="Architecture" prose={false}>
        <PipelineDiagram />
      </CaseStudySection>
    </CaseStudyShell>
  )
}
