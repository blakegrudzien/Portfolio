import styles from './NodeInfoPanel.module.css'

export interface NodeInfo {
  label: string
  context: string
  tradeoff?: string
  payload?: { label: string; lines: string[] }
}

export function NodeInfoPanel({ info }: { info: NodeInfo | null }) {
  return (
    <div className={styles.panel}>
      {info ? (
        <>
          <p className={styles.label}>{info.label}</p>
          <p className={styles.context}>{info.context}</p>
          {info.tradeoff && (
            <p className={styles.tradeoff}>
              <span className={styles.tradeoffLabel}>Why: </span>
              {info.tradeoff}
            </p>
          )}
          {info.payload && (
            <div className={styles.payload}>
              <p className={styles.payloadLabel}>{info.payload.label}</p>
              <pre className={styles.payloadBody}>
                {info.payload.lines.join('\n')}
              </pre>
            </div>
          )}
        </>
      ) : (
        <p className={styles.empty}>
          Hover or focus a step in the diagram to see what the payload looks
          like there — and, for a few of them, the reasoning behind how it's
          built.
        </p>
      )}
    </div>
  )
}
