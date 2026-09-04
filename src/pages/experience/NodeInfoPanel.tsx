import styles from './NodeInfoPanel.module.css'

export interface NodeInfo {
  label: string
  context: string
  tradeoff?: string
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
        </>
      ) : (
        <p className={styles.empty}>
          Hover or focus a step in the diagram for context — and for a few of
          them, the reasoning behind how it's built.
        </p>
      )}
    </div>
  )
}
