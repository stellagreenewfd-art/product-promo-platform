const express = require('express')
const fs = require('fs')
const path = require('path')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000
const DIST_DIR = path.join(__dirname, '..', 'dist')

// JSONBin config — hardcoded fallback if env vars not set
const JSONBIN_KEY = process.env.JSONBIN_MASTER_KEY || '$2a$10$dHfFZ48xmjYljgAlz6z4B.NZQdUX7yJQatzsw5Tld3In/NCsoBx1i'
const JSONBIN_ID = process.env.JSONBIN_BIN_ID || '6a5f84b6da38895dfe7b46f2'
const JSONBIN_API = 'https://api.jsonbin.io/v3/b'
const USE_JSONBIN = JSONBIN_KEY && JSONBIN_ID

// Local fallback
const DATA_FILE = path.join('/tmp', 'data.json')

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// ── Data loader ──

function loadLocal() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) }
  catch { return { users: [], cases: [], counter: 0 } }
}

function saveLocal(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8') } catch {}
}

async function loadRemote() {
  const r = await fetch(`${JSONBIN_API}/${JSONBIN_ID}/latest`, {
    headers: { 'X-Master-Key': JSONBIN_KEY }
  })
  if (!r.ok) throw new Error(`JSONBin load failed: ${r.status}`)
  const { record } = await r.json()
  return record || { users: [], cases: [], counter: 0 }
}

async function saveRemote(data) {
  const r = await fetch(`${JSONBIN_API}/${JSONBIN_ID}`, {
    method: 'PUT',
    headers: { 'X-Master-Key': JSONBIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!r.ok) console.error('JSONBin save failed:', r.status)
}

let data = { users: [], cases: [], counter: 0 }

// ── Serve static frontend ──

app.use(express.static(DIST_DIR))

// ── API routes ──

app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: true, storage: USE_JSONBIN ? 'jsonbin' : 'local', users: data.users.length, cases: data.cases.length })
})

app.get('/api/data', (req, res) => {
  res.json({
    users: data.users.map(u => Object.assign({}, u, { password: undefined })),
    cases: [...data.cases].reverse()
  })
})

app.post('/api/register', async (req, res) => {
  const { name, phone, company, category, account, password } = req.body
  if (!phone || !account || !password) {
    return res.status(400).json({ error: '手机号、账号、密码为必填项' })
  }
  if (data.users.find(u => u.account === account)) {
    return res.status(400).json({ error: '该账号已被注册' })
  }
  data.counter++
  const user = { id: data.counter, name, phone, company, category, account, password, createdAt: new Date().toISOString() }
  data.users.push(user)
  await persist()
  res.json({ success: true, user: Object.assign({}, user, { password: undefined }) })
})

app.post('/api/login', (req, res) => {
  const { account, password } = req.body
  const user = data.users.find(u => u.account === account && u.password === password)
  if (!user) return res.status(401).json({ error: '账号或密码错误' })
  res.json({ success: true, user: Object.assign({}, user, { password: undefined }) })
})

app.post('/api/cases', async (req, res) => {
  const { user, phone, company, category, product, platforms } = req.body
  const entry = { user, phone, company, category, product, platforms, createdAt: new Date().toISOString() }
  data.cases.push(entry)
  await persist()
  res.json({ success: true })
})

// SPA fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  } else {
    next()
  }
})

// ── Persistence ──

async function persist() {
  if (USE_JSONBIN) {
    try { await saveRemote(data) } catch (err) { console.error('JSONBin persist error:', err.message) }
  } else {
    saveLocal(data)
  }
}

// ── Start ──

async function start() {
  if (USE_JSONBIN) {
    try {
      data = await loadRemote()
      console.log(`Loaded from JSONBin: ${data.users.length} users, ${data.cases.length} cases`)
    } catch (err) {
      console.error('JSONBin load failed:', err.message)
      console.warn('Falling back to local data')
      data = loadLocal()
    }
  } else {
    data = loadLocal()
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} | storage: ${USE_JSONBIN ? 'jsonbin' : 'local'}`)
  })
}

start()
