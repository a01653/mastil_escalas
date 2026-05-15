/* eslint-disable react-refresh/only-export-components */
import { Component, StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

if (import.meta.env.DEV || new URLSearchParams(window.location.search).get('debug') === '1') {
  import('./music/mastilDebug.js').then(({ registerMastilDebug }) => registerMastilDebug())
}

const APP_STORAGE_PREFIX = 'mastil_interactivo_guitarra_'
const root = createRoot(document.getElementById('root'))

function resetLocalStateAndReload() {
  if (typeof window === 'undefined') return
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(APP_STORAGE_PREFIX)) window.localStorage.removeItem(key)
    }
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith(APP_STORAGE_PREFIX)) window.sessionStorage.removeItem(key)
    }
  } catch {
    // Aunque falle el borrado, intentamos recargar igualmente.
  }
  window.location.reload()
}

function reloadPage() {
  if (typeof window === 'undefined') return
  window.location.reload()
}

function AppLoadStatus() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: '#f8fafc',
      color: '#0f172a',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
    }}>
      <div style={{
        borderRadius: '20px',
        border: '1px solid #cbd5e1',
        background: '#ffffff',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.10)',
        padding: '20px 24px',
        fontSize: '15px',
        fontWeight: 700,
      }}>
        Cargando Mastil de Escalas...
      </div>
    </div>
  )
}

function RootErrorPanel({ error, detail }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: '#f8fafc',
      color: '#0f172a',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
    }}>
      <div style={{
        width: 'min(720px, 100%)',
        borderRadius: '20px',
        border: '1px solid #cbd5e1',
        background: '#ffffff',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.10)',
        padding: '24px',
      }}>
        <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
          La app encontro un error al cargarse
        </div>
        <div style={{ fontSize: '15px', lineHeight: 1.6, color: '#334155', marginBottom: '16px' }}>
          {error?.message || 'Se produjo un error no controlado en el cliente.'}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={resetLocalStateAndReload}
            style={{
              border: '1px solid #0f172a',
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '999px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Restablecer configuracion local
          </button>
          <button
            type="button"
            onClick={reloadPage}
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '999px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recargar
          </button>
        </div>
        {detail ? (
          <details open>
            <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
              Ver detalle tecnico
            </summary>
            <pre style={{
              marginTop: '12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              borderRadius: '12px',
              background: '#e2e8f0',
              padding: '12px',
              fontSize: '12px',
              lineHeight: 1.5,
              color: '#0f172a',
            }}>
              {detail}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  )
}

function renderBootError(error, detail = '') {
  root.render(<RootErrorPanel error={error} detail={detail || error?.stack || String(error || '')} />)
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const error = event?.error || new Error(event?.message || 'Error desconocido al cargar la app.')
    renderBootError(error, error?.stack || String(event?.message || ''))
  })
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason
    const error = reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : 'Promesa rechazada sin controlar.')
    renderBootError(error, error?.stack || String(reason || ''))
  })
}

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, detail: '' }
    this.handleWindowError = this.handleWindowError.bind(this)
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this)
    this.handleResetLocalState = this.handleResetLocalState.bind(this)
    this.handleReload = this.handleReload.bind(this)
  }

  static getDerivedStateFromError(error) {
    return {
      error,
      detail: error?.stack || '',
    }
  }

  componentDidCatch(error, info) {
    this.setState({
      error,
      detail: [error?.stack, info?.componentStack].filter(Boolean).join('\n\n'),
    })
  }

  componentDidMount() {
    if (typeof window === 'undefined') return
    window.addEventListener('error', this.handleWindowError)
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  componentWillUnmount() {
    if (typeof window === 'undefined') return
    window.removeEventListener('error', this.handleWindowError)
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  handleWindowError(event) {
    const error = event?.error || new Error(event?.message || 'Error desconocido al cargar la app.')
    this.setState({
      error,
      detail: error?.stack || String(event?.message || ''),
    })
  }

  handleUnhandledRejection(event) {
    const reason = event?.reason
    const error = reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : 'Promesa rechazada sin controlar.')
    this.setState({
      error,
      detail: error?.stack || String(reason || ''),
    })
  }

  handleResetLocalState() {
    resetLocalStateAndReload()
  }

  handleReload() {
    reloadPage()
  }

  render() {
    if (!this.state.error) return this.props.children

    return <RootErrorPanel error={this.state.error} detail={this.state.detail} />
  }
}

root.render(<AppLoadStatus />)

import('./App.jsx')
  .then(({ default: App }) => {
    root.render(
      <StrictMode>
        <RootErrorBoundary>
          {createElement(App)}
        </RootErrorBoundary>
      </StrictMode>,
    )
  })
  .catch((error) => renderBootError(error))
