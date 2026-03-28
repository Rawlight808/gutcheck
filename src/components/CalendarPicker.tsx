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
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate))

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
            disabled={isSameMonth(viewMonth, today)}
            style={{ opacity: isSameMonth(viewMonth, today) ? 0.3 : 1 }}
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
              const isToday = isSameDay(day, today)
              const future = isAfter(day, today)
              const dateStr = format(day, 'yyyy-MM-dd')

              return (
                <button
                  key={dateStr}
                  className={
                    'cal__day' +
                    (sel ? ' cal__day--sel' : '') +
                    (isToday && !sel ? ' cal__day--today' : '') +
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

        <button className="btn btn--ghost btn--full" style={{ marginTop: '0.6rem', fontSize: '0.82rem' }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
