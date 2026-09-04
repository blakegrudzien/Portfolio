import type { ReactNode } from 'react'
import styles from './ExpandablePanelList.module.css'

interface Panel {
  id: string
  title: string
  children: ReactNode
}

interface ExpandablePanelListProps {
  panels: Panel[]
  defaultOpenId?: string
}

export function ExpandablePanelList({
  panels,
  defaultOpenId,
}: ExpandablePanelListProps) {
  return (
    <div className={styles.list}>
      {panels.map((panel) => (
        <details
          key={panel.id}
          className={styles.panel}
          open={panel.id === defaultOpenId}
        >
          <summary className={styles.summary}>{panel.title}</summary>
          <div className={styles.content}>{panel.children}</div>
        </details>
      ))}
    </div>
  )
}
