import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isAfter,
} from 'date-fns'

type Props = {
  selected: string // YYYY-MM-DD
  onSelect: (date: string) => void
  onClose: () => void
}

export function CalendarPicker({ selected, onSelect, onClose }: Props) {
  const selectedDate = new Date(selected + 'T12:00:00')
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate))
  const isViewingCurrentMonth = isSameMonth(viewMonth, today)
  const isSelectedToday = selected === todayStr

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 })
    const rows: Date[][] = []
    let day = start
    while (day <= end) {
      const week: Date[] = []
      for (let i = 0; i < 7; i++) {
        week.push(day)
        day = addDays(day, 1)
      }
      rows.push(week)
    }
    return rows
  }, [viewMonth])

  const jumpToToday = () => {
    onSelect(todayStr)
    onClose()
  }

  return (
    <div className="cal-overlay" onClick={onClose}>
      <div className="cal" onClick={(e) => e.stopPropagation()}>
        <div className="cal__header">
          <button className="cal__nav" onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
            &larr;
          </button>
          <span className="cal__month">{format(viewMonth, 'MMMM yyyy')}</span>
          <button
            className="cal__nav"
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            disabled={isViewingCurrentMonth}
            style={{ opacity: isViewingCurrentMonth ? 0.3 : 1 }}
          >
            &rarr;
          </button>
        </div>

        <div className="cal__weekdays">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i} className="cal__wd">{d}</span>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="cal__row">
            {week.map((day) => {
              const inMonth = isSameMonth(day, viewMonth)
              const sel = isSameDay(day, selectedDate)
              const isDayToday = isSameDay(day, today)
              const future = isAfter(day, today)
              const dateStr = format(day, 'yyyy-MM-dd')

              return (
                <button
                  key={dateStr}
                  className={
                    'cal__day' +
                    (sel ? ' cal__day--sel' : '') +
                    (isDayToday && !sel ? ' cal__day--today' : '') +
                    (!inMonth || future ? ' cal__day--muted' : '')
                  }
                  disabled={future}
                  onClick={() => {
                    onSelect(dateStr)
                    onClose()
                  }}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
          {!isSelectedToday && (
            <button
              className="btn btn--primary"
              style={{ flex: 1, fontSize: '0.82rem' }}
              onClick={jumpToToday}
            >
              Today
            </button>
          )}
          <button
            className="btn btn--ghost"
            style={{ flex: 1, fontSize: '0.82rem' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
