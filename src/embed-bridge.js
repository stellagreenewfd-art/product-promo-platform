// src/embed-bridge.js
// postMessage bridge — receives sso_token from parent window (more secure than URL query)
// Only activates in embed mode (window.__EMBED__)
// Falls back to query-based SSO if no postMessage received within 3 seconds

import { loginWithToken } from './utils/sso-frontend'

const PARENT_ORIGIN = '*'
const SSO_TIMEOUT_MS = 3000

export function initEmbedBridge() {
  if (!window.__EMBED__) return

  let resolved = false

  // Listen for sso_token from parent
  window.addEventListener('message', (e) => {
    if (resolved) return
    const msg = e.data
    if (!msg || msg.type !== 'sso_token' || !msg.token) return
    resolved = true
    loginWithToken(msg.token)
  })

  // Tell parent: iframe is ready
  window.parent?.postMessage({ type: 'embed_ready' }, PARENT_ORIGIN)

  // Fallback: if no postMessage within SSO_TIMEOUT_MS, try URL query
  setTimeout(() => {
    if (!resolved) {
      resolved = true
      const params = new URLSearchParams(window.location.search)
      const token = params.get('sso_token')
      if (token) loginWithToken(token)
    }
  }, SSO_TIMEOUT_MS)
}
