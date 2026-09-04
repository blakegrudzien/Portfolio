import styles from './TelemetryPreview.module.css'
import type { Phase } from './PipelineDiagram'

const RAW = ['4F 2A 9C 01 3E 88 D2 00', '71 4B FF 02 1A 90 C3 5D']

const DECODED = [
  '{',
  '  "event": "battery_status",',
  '  "source": "lock-04af",',
  '  "battery": "62%"',
  '}',
]

interface PreviewContent {
  label: string
  lines: string[]
  tone?: 'error' | 'success'
}

const CONTENT: Record<Phase, PreviewContent | null> = {
  idle: null,
  'traveling-common': { label: 'Raw device bytes', lines: RAW },
  choice: { label: 'Raw device bytes', lines: RAW },
  'traveling-failure': {
    label: 'Parse error',
    lines: ['⚠ unrecognized event type'],
    tone: 'error',
  },
  'in-dlq': {
    label: 'Held in DLQ',
    lines: ['⚠ unrecognized event type', 'waiting for a parser fix'],
    tone: 'error',
  },
  'traveling-redrive': {
    label: 'Retrying',
    lines: ['Redriven through SQS —', 'the parser has since been fixed.'],
  },
  'traveling-success': { label: 'Decoded record', lines: DECODED },
  'done-success': {
    label: 'Stored as Parquet',
    lines: ['✓ queryable via Athena'],
    tone: 'success',
  },
}

export function TelemetryPreview({ phase }: { phase: Phase }) {
  const content = CONTENT[phase]

  return (
    <div className={styles.panel}>
      <p className={styles.eyebrow}>Telemetry payload</p>
      {content ? (
        <>
          <p className={styles.stateLabel}>{content.label}</p>
          <pre
            className={`${styles.body} ${content.tone === 'error' ? styles.bodyError : ''} ${
              content.tone === 'success' ? styles.bodySuccess : ''
            }`}
          >
            {content.lines.join('\n')}
          </pre>
        </>
      ) : (
        <p className={styles.empty}>No telemetry yet.</p>
      )}
    </div>
  )
}
