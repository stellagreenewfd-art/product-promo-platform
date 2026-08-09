// src/utils/sso-frontend.js
// SSO auto-login for ClaWOW iframe integration
// Reads ?sso_token from URL, posts to /api/auth/sso, stores user in sessionStorage

const API_BASE = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' ? '/api' : '/api')
  : '/api'

let currentSSOUser = null

/**
 * Initialize SSO — check URL for sso_token and auto-login.
 * Call this ONCE at app startup (before React renders).
 */
export async function initSSO() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('sso_token')
  if (!token) return null

  return loginWithToken(token)
}

/**
 * Login with a JWT sso_token.
 * Returns user object or null on failure.
 */
export async function loginWithToken(token) {
  if (!token) return null

  try {
    const res = await fetch(`${API_BASE}/auth/sso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sso_token: token }),
    })

    if (!res.ok) {
      console.warn('SSO login failed:', res.status)
      return null
    }

    const data = await res.json()
    if (data.success && data.user) {
      currentSSOUser = data.user
      // Store in sessionStorage for React to read
      try {
        sessionStorage.setItem('sso_user', JSON.stringify(data.user))
      } catch { /* quota exceeded, non-critical */ }
      return data.user
    }
    return null
  } catch (err) {
    console.error('SSO login error:', err.message)
    return null
  }
}

/**
 * Check if a user was logged in via SSO.
 */
export function getSSOUser() {
  if (currentSSOUser) return currentSSOUser
  try {
    const stored = sessionStorage.getItem('sso_user')
    if (stored) {
      currentSSOUser = JSON.parse(stored)
      return currentSSOUser
    }
  } catch { /* ignore */ }
  return null
}

/**
 * Clear SSO session.
 */
export function clearSSOUser() {
  currentSSOUser = null
  try { sessionStorage.removeItem('sso_user') } catch { /* ignore */ }
}
