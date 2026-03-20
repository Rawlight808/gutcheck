import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { v4 as uuid } from 'uuid'
import { saveFoodEntry } from '../store'
import { FOOD_TAGS } from '../types'
import type { MealSlot, FoodTag } from '../types'

const MEALS: { slot: MealSlot; label: string; emoji: string }[] = [
  { slot: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { slot: 'lunch', label: 'Lunch', emoji: '☀️' },
  { slot: 'dinner', label: 'Dinner', emoji: '🌙' },
  { slot: 'snack', label: 'Snack', emoji: '🍿' },
]

export function LogFoodPage() {
  const navigate = useNavigate()
  const [meal, setMeal] = useState<MealSlot>('breakfast')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<Set<FoodTag>>(new Set())

  const toggleTag = (tag: FoodTag) => {
    setTags((prev) => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }

  const handleSave = () => {
    if (!description.trim()) return

    saveFoodEntry({
      id: uuid(),
      date: format(new Date(), 'yyyy-MM-dd'),
      meal,
      description: description.trim(),
      tags: [...tags],
      createdAt: new Date().toISOString(),
    })

    setDescription('')
    setTags(new Set())
    navigate('/')
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Log Food</h1>
        <p className="page-subtitle">What did you eat?</p>
      </div>

      {/* Meal selector */}
      <div className="meal-tabs">
        {MEALS.map((m) => (
          <button
            key={m.slot}
            className={`meal-tab ${meal === m.slot ? 'meal-tab--active' : ''}`}
            onClick={() => setMeal(m.slot)}
          >
            {m.emoji}<br />{m.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="card">
        <div className="card__label">What did you eat?</div>
        <input
          className="input"
          placeholder="e.g. Eggs, toast with butter, coffee"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoFocus
        />
      </div>

      {/* Tags */}
      <div className="card">
        <div className="card__label">Food Tags</div>
        <div className="tag-grid">
          {FOOD_TAGS.map((t) => (
            <button
              key={t.id}
              className={`tag-chip ${tags.has(t.id) ? 'tag-chip--selected' : ''}`}
              onClick={() => toggleTag(t.id)}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <div style={{ marginTop: '1rem' }}>
        <button
          className="btn btn--primary btn--full"
          onClick={handleSave}
          disabled={!description.trim()}
          style={{ opacity: description.trim() ? 1 : 0.45 }}
        >
          Save Entry
        </button>
      </div>
    </div>
  )
}
