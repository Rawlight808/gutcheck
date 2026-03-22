import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || 'Something went wrong' }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('ChewClue error:', err, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            padding: '2rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
            background: '#f8f6f2',
            color: '#1a1a1a',
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>ChewClue couldn’t load</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.75, marginBottom: '1rem' }}>{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: 10,
              border: 'none',
              background: '#863bff',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
