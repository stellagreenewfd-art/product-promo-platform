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
initEmbedBridge() // postMessage sso_token (alternative, safer)

// Wait for URL-based SSO to resolve BEFORE first render so the user lands logged-in (no flash)
initSSO().then((ssoUser) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App initialUser={ssoUser} />
    </StrictMode>,
  )
})
