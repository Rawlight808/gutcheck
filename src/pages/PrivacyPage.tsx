import { Link } from 'react-router-dom'

const policySrc = `${(import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/')}privacy.html`

export function PrivacyPage() {
  return (
    <div className="privacy-page">
      <header className="privacy-page__header">
        <Link to="/" className="privacy-page__back">
          ← Back
        </Link>
      </header>
      <iframe className="privacy-page__frame" title="Privacy Policy" src={policySrc} />
    </div>
  )
}
