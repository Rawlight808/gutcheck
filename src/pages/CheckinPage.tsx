import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { v4 as uuid } from 'uuid'
import { cloudGetCheckinForDate, cloudSaveCheckin } from '../cloudStore'
import type { BowelRating, DailyCheckin } from '../types'

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

  const [existing, setExisting] = useState<DailyCheckin | undefined>()
  const [loaded, setLoaded] = useState(false)
  const [energy, setEnergy] = useState(0)
  const [mood, setMood] = useState(0)
  const [pain, setPain] = useState(0)
  const [bowel, setBowel] = useState(0)
  const [sleep, setSleep] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    cloudGetCheckinForDate(today).then((c) => {
      if (c) {
        setExisting(c)
        setEnergy(c.energy)
        setMood(c.mood)
        setPain(c.pain)
        setBowel(c.bowel)
        setSleep(c.sleepQuality)
        setNotes(c.notes)
      }
      setLoaded(true)
    })
  }, [today])

  const canSave = energy > 0 && mood > 0 && pain > 0 && bowel > 0 && sleep > 0

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    await cloudSaveCheckin({
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
    setSaving(false)
    navigate('/')
  }

  if (!loaded) {
    return <p style={{ textAlign: 'center', color: 'var(--clr-text-muted)', padding: '2rem' }}>Loading...</p>
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
          disabled={!canSave || saving}
          style={{ opacity: canSave && !saving ? 1 : 0.45 }}
        >
          {saving ? 'Saving...' : existing ? 'Update Check-In' : 'Save Check-In'}
        </button>
      </div>
    </div>
  )
}
