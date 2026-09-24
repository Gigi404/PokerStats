import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { ensurePersistentStorage } from './lib/storage.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Both after render and never awaited: asking not to be evicted and caching the
// app for offline use are protections around the app, not preconditions for
// starting it. A failure in either must still leave a working screen.
ensurePersistentStorage()
try {
  registerSW({ immediate: true })
} catch {
  // The app still works; it just will not open with no signal.
}
