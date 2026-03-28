import { useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { CalendarPicker } from './CalendarPicker'

type Props = {
  /** YYYY-MM-DD */
  selected: string
  onDateChange: (nextDate: string) => void
  /** Shown under the date when viewing today (e.g. Today home tagline). */
  todayHint?: string
  /**
   * `page` — main screen title size (Today home).
   * `compact` — smaller strip for Log / Check-in pages.
   */
  variant?: 'page' | 'compact'
}

export function DateHeaderWithCalendar({ selected, onDateChange, todayHint, variant = 'compact' }: Props) {
  const [showCal, setShowCal] = useState(false)
  const todayString = format(new Date(), 'yyyy-MM-dd')
  const isToday = selected === todayString
  const anchor = new Date(selected + 'T12:00:00')

  const titleClass = variant === 'page' ? 'page-title' : undefined
  const titleStyle = variant === 'compact'
    ? { fontSize: '1rem', fontWeight: 700 as const, letterSpacing: '-0.02em' }
    : undefined

  const secondLine = isToday
    ? (todayHint ?? 'Tap calendar to pick a date')
    : format(anchor, 'EEEE, MMMM d, yyyy')

  return (
    <>
      {showCal && (
        <CalendarPicker
          selected={selected}
          onSelect={onDateChange}
          onClose={() => setShowCal(false)}
        />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          marginBottom: variant === 'page' ? undefined : '0.75rem',
        }}
      >
        <button
          type="button"
          className="btn btn--ghost"
          style={{ padding: '0.4rem' }}
          onClick={() => onDateChange(format(subDays(anchor, 1), 'yyyy-MM-dd'))}
        >
          ←
        </button>
        <button type="button" className="date-label-btn" style={{ flex: 1, minWidth: 0 }} onClick={() => setShowCal(true)}>
          <h1 className={titleClass} style={titleStyle}>
            {isToday ? 'Today' : format(anchor, 'EEE, MMM d')}
          </h1>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: variant === 'page' ? '0.15rem' : '0.05rem' }}>
            {secondLine}
            <span style={{ fontSize: '0.72rem', color: 'var(--clr-accent)' }}>&#x1F4C5;</span>
          </p>
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          style={{ padding: '0.4rem', opacity: isToday ? 0.3 : 1 }}
          onClick={() => { if (!isToday) onDateChange(format(addDays(anchor, 1), 'yyyy-MM-dd')) }}
          disabled={isToday}
        >
          →
        </button>
      </div>
    </>
  )
}
