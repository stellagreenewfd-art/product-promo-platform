// promo-clawow-integration/server/server-patch.js
// Reference: how server/index.cjs was modified for SSO + embedding
// NOT an actual patch — manual edits were applied directly

/*
  1. Added at top:
     const embedding = require('./embedding')
  
  2. Added after cors():
     app.use(embedding)

  3. After SPA fallback, added SSO routes:
     try {
       const createSSORoutes = require('./sso-routes')
       ssoRoutes = createSSORoutes(() => data, () => persist)
       app.use('/api', ssoRoutes)
     } catch (err) {
       console.warn('SSO routes not loaded:', err.message)
     }

  4. In /api/cases route, added incremental analysis tracking:
     try {
       const { incrementAnalysis } = require('./data-store')
       incrementAnalysis(data, user)
     } catch {}
*/

// Files created:
// server/embedding.js        — CSP frame-ancestors middleware
// server/sso-routes.js       — POST /api/auth/sso | GET /api/usage | GET /api/usage/:account
// server/data-store.js       — incrementLogin, incrementAnalysis, buildUsageStats
// src/embed.js               — initEmbedMode flag + deep link
// src/embed.css              — hide nav/header in embed mode
// src/embed-bridge.js        — postMessage bridge for sso_token
// src/utils/sso-frontend.js  — initSSO, loginWithToken, getSSOUser

// Frontend modifications:
// src/main.jsx — added initEmbedMode(), initSSO(), initEmbedBridge() before render
// src/App.jsx  — loadUser() now checks sessionStorage for SSO user
