import { useState, type FormEvent } from 'react'
import { MARBLE_COUNT } from '../logic/types'
import type { MarbleId } from '../logic/types'
import styles from './FinalAnswerForm.module.css'

interface FinalAnswerFormProps {
  onSubmit: (marbleId: MarbleId, weight: 'heavier' | 'lighter') => void
}

export function FinalAnswerForm({ onSubmit }: FinalAnswerFormProps) {
  const [marbleId, setMarbleId] = useState<MarbleId | ''>('')
  const [weight, setWeight] = useState<'heavier' | 'lighter' | ''>('')

  const canSubmit = marbleId !== '' && weight !== ''

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (marbleId === '' || weight === '') return
    onSubmit(marbleId, weight)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Which marble is the odd one?
        <select
          className={styles.select}
          value={marbleId}
          onChange={(event) =>
            setMarbleId(
              event.target.value === '' ? '' : Number(event.target.value),
            )
          }
        >
          <option value="">Choose a marble</option>
          {Array.from({ length: MARBLE_COUNT }, (_, id) => (
            <option key={id} value={id}>
              Marble {id + 1}
            </option>
          ))}
        </select>
      </label>

      <fieldset className={styles.fieldset}>
        <legend>Heavier or lighter?</legend>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="weight"
            value="heavier"
            checked={weight === 'heavier'}
            onChange={() => setWeight('heavier')}
          />
          Heavier
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="weight"
            value="lighter"
            checked={weight === 'lighter'}
            onChange={() => setWeight('lighter')}
          />
          Lighter
        </label>
      </fieldset>

      <button type="submit" disabled={!canSubmit} className={styles.submit}>
        Lock in my answer
      </button>
    </form>
  )
}
