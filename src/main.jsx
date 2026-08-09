import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './embed.css'
import App from './App.jsx'
import { initEmbedMode } from './embed.js'
import { initEmbedBridge } from './embed-bridge.js'
import { initSSO } from './utils/sso-frontend.js'

// ── Embed mode (iframe) setup ──
initEmbedMode()
initSSO()         // URL sso_token → POST /api/auth/sso
initEmbedBridge() // postMessage sso_token (alternative, safer)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
