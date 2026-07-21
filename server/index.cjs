const express = require('express')
const fs = require('fs')
const path = require('path')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000
const DIST_DIR = path.join(__dirname, '..', 'dist')
const DATA_FILE = path.join('/tmp', 'data.json')

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// ── In-memory data store (backed by JSON file) ──

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) }
  catch { return { users: [], cases: [], counter: 0 } }
}

function saveData(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8') } catch {}
}

let data = loadData()
if (fs.existsSync(DATA_FILE)) data = loadData()

// ── Serve static frontend ──

app.use(express.static(DIST_DIR))

// ── API routes ──

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: true, users: data.users.length, cases: data.cases.length })
})

// GET /api/data — admin only: all users & cases
app.get('/api/data', (req, res) => {
  const users = data.users.map(u => ({ ...u, password: undefined }))
  const cases = [...data.cases].reverse()
  res.json({ users, cases })
})

// POST /api/register
app.post('/api/register', (req, res) => {
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
  saveData(data)
  res.json({ success: true, user: { ...user, password: undefined } })
})

// POST /api/login
app.post('/api/login', (req, res) => {
  const { account, password } = req.body
  const user = data.users.find(u => u.account === account && u.password === password)
  if (!user) return res.status(401).json({ error: '账号或密码错误' })
  res.json({ success: true, user: { ...user, password: undefined } })
})

// POST /api/cases
app.post('/api/cases', (req, res) => {
  const { user, phone, company, category, product, platforms } = req.body
  data.cases.push({ user, phone, company, category, product, platforms, createdAt: new Date().toISOString() })
  saveData(data)
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

// ── Start ──

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
