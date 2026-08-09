// server/sso-routes.js
// SSO authentication + usage tracking routes for ClaWOW integration
// JWT: HMAC-SHA256, no external libs. Data injection model — no circular deps.

const crypto = require('crypto')
const { incrementLogin, incrementAnalysis, buildUsageStats } = require('./data-store')

// Shared secret
const SSO_SECRET = process.env.SSO_SECRET || 'clawow-sso-dev-secret-2026'

// ── JWT verify ──

function base64urlDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(b64, 'base64')
}

function verifyJWT(token, secret) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const header = JSON.parse(base64urlDecode(parts[0]).toString('utf-8'))
    const payload = JSON.parse(base64urlDecode(parts[1]).toString('utf-8'))
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${parts[0]}.${parts[1]}`)
      .digest('base64url')

    if (parts[2] !== expectedSig) return null
    if (payload.exp && Date.now() > payload.exp) return null
    if (!payload.account) return null
    return payload
  } catch { return null }
}

// ── Route factory (receives data ref and persist function from index.cjs) ──

function createSSORoutes(getData, getPersist) {
  const router = require('express').Router()

  // GET /api/usage — admin usage stats
  router.get('/usage', (req, res) => {
    const d = getData()
    res.json(buildUsageStats(d?.users || []))
  })

  // GET /api/usage/:account — single user usage
  router.get('/usage/:account', (req, res) => {
    const d = getData()
    const stats = buildUsageStats(d?.users || [])
    const entry = stats.find(u => u.account === req.params.account)
    if (!entry) return res.status(404).json({ error: '用户不存在' })
    res.json(entry)
  })

  // POST /api/auth/sso — verify token, auto-create/login user
  router.post('/auth/sso', async (req, res) => {
    const { sso_token } = req.body
    if (!sso_token) return res.status(400).json({ error: '缺少 sso_token' })

    const payload = verifyJWT(sso_token, SSO_SECRET)
    if (!payload) return res.status(401).json({ error: 'sso_token 无效或已过期' })

    const d = getData()
    if (!d) return res.status(500).json({ error: '数据未初始化' })

    const { account, name, phone, company, category, clawowAccountId } = payload
    const persistFn = getPersist ? getPersist() : null

    let user = d.users.find(u => u.account === account)
    if (!user) {
      d.counter = (d.counter || 0) + 1
      user = {
        id: d.counter,
        account,
        name: name || account,
        phone: phone || '',
        company: company || '',
        category: category || '',
        password: '',
        clawowAccountId: clawowAccountId || account,
        ssoUser: true,
        createdAt: new Date().toISOString(),
        loginCount: 0,
        analysisCount: 0,
      }
      d.users.push(user)
      if (persistFn) await persistFn().catch(() => {})
    }

    incrementLogin(d, account)

    // Track analysisCount in case creation too
    if (d._analysisHook) {
      d._analysisHook(account)
    }

    res.json({
      success: true,
      user: Object.assign({}, user, { password: undefined }),
    })
  })

  return router
}

module.exports = createSSORoutes
module.exports.verifyJWT = verifyJWT
module.exports.SSO_SECRET = SSO_SECRET
module.exports.incrementAnalysis = incrementAnalysis
