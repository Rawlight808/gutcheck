import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { v4 as uuid } from 'uuid'
import { getCheckinForDate, saveCheckin } from '../store'
import type { BowelRating } from '../types'

function RatingRow({ label, value, onChange, labels }: {
  label: string
  value: number
  onChange: (v: number) => void
  labels?: string[]
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div className="card__label">{label}</div>
      {labels && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--clr-text-muted)', marginBottom: '0.25rem' }}>
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
      <div className="rating-row">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            className={`rating-btn ${value === n ? 'rating-btn--selected' : ''}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CheckinPage() {
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')
  const existing = useMemo(() => getCheckinForDate(today), [])

  const [energy, setEnergy] = useState(existing?.energy ?? 0)
  const [mood, setMood] = useState(existing?.mood ?? 0)
  const [pain, setPain] = useState(existing?.pain ?? 0)
  const [bowel, setBowel] = useState<number>(existing?.bowel ?? 0)
  const [sleep, setSleep] = useState(existing?.sleepQuality ?? 0)
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const canSave = energy > 0 && mood > 0 && pain > 0 && bowel > 0 && sleep > 0

  const handleSave = () => {
    if (!canSave) return
    saveCheckin({
      id: existing?.id ?? uuid(),
      date: today,
      sleepQuality: sleep,
      energy,
      mood,
      pain,
      bowel: bowel as BowelRating,
      notes: notes.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    })
    navigate('/')
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Morning Check-In</h1>
        <p className="page-subtitle">How are you feeling today?</p>
      </div>

      <div className="card">
        <RatingRow label="Sleep Quality" value={sleep} onChange={setSleep} labels={['Poor', 'Great']} />
        <RatingRow label="Energy Level" value={energy} onChange={setEnergy} labels={['Exhausted', 'Energized']} />
        <RatingRow label="Mood" value={mood} onChange={setMood} labels={['Low', 'Great']} />
        <RatingRow label="Pain Level" value={pain} onChange={setPain} labels={['None', 'Severe']} />
        <RatingRow label="Bowel Movement" value={bowel} onChange={setBowel} labels={['Bad', 'Great']} />

        <div style={{ marginTop: '0.5rem' }}>
          <div className="card__label">Notes (optional)</div>
          <textarea
            className="input input--textarea"
            placeholder="Anything else you noticed..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button
          className="btn btn--primary btn--full"
          onClick={handleSave}
          disabled={!canSave}
          style={{ opacity: canSave ? 1 : 0.45 }}
        >
          {existing ? 'Update Check-In' : 'Save Check-In'}
        </button>
      </div>
    </div>
  )
}
