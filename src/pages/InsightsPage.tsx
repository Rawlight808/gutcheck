import { useMemo } from 'react'
import { getFoodEntries, getCheckins } from '../store'
import { detectTriggers } from '../insights'

export function InsightsPage() {
  const insights = useMemo(() => {
    const foods = getFoodEntries()
    const checkins = getCheckins()
    return detectTriggers(foods, checkins)
  }, [])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Insights</h1>
        <p className="page-subtitle">Patterns between what you eat and how you feel</p>
      </div>

      {insights.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🔬</div>
          <p className="empty-state__text">
            Keep logging food and check-ins for a few days.<br />
            Patterns will appear here once there's enough data.
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.82rem', color: 'var(--clr-text-muted)', marginBottom: '1rem' }}>
            Based on your logs, these foods may be affecting how you feel.
          </p>
          {insights.slice(0, 12).map((ins, i) => (
            <div key={`${ins.tag}-${ins.symptom}-${i}`} className="insight-card">
              <p style={{ fontSize: '0.92rem' }}>
                <span className="insight-tag">{ins.label}</span> may be linked to{' '}
                <span className="insight-symptom">{ins.symptom}</span>
              </p>
              <div className="insight-bar">
                <div
                  className="insight-bar__fill"
                  style={{ width: `${Math.round(ins.score * 100)}%` }}
                />
              </div>
              <p className="insight-detail">
                {ins.occurrences} days with this food &middot;
                Avg score after: {ins.avgSymptomAfter} vs without: {ins.avgSymptomWithout}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
