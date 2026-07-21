const express = require('express')
const fs = require('fs')
const path = require('path')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000
const DATA_FILE = path.join(__dirname, '..', 'data.json')
const DIST_DIR = path.join(__dirname, '..', 'dist')

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Serve static frontend
app.use(express.static(DIST_DIR))

// Load data
function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) }
  catch { return { users: [], cases: [] } }
}

// Save data
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

// GET /api/data — return all data
app.get('/api/data', (req, res) => {
  res.json(loadData())
})

// POST /api/register — register new user
app.post('/api/register', (req, res) => {
  const { name, phone, company, category, account, password } = req.body
  if (!phone || !account || !password) {
    return res.status(400).json({ error: '手机号、账号、密码为必填项' })
  }
  const data = loadData()
  if (data.users.find(u => u.account === account)) {
    return res.status(400).json({ error: '该账号已被注册' })
  }
  const user = { name, phone, company, category, account, password, time: new Date().toISOString() }
  data.users.push(user)
  saveData(data)
  res.json({ success: true, user: { ...user, password: undefined } })
})

// POST /api/login — login
app.post('/api/login', (req, res) => {
  const { account, password } = req.body
  const data = loadData()
  const user = data.users.find(u => u.account === account && u.password === password)
  if (!user) return res.status(401).json({ error: '账号或密码错误' })
  res.json({ success: true, user: { ...user, password: undefined } })
})

// POST /api/cases — log analysis case
app.post('/api/cases', (req, res) => {
  const { user, phone, company, category, product, platforms } = req.body
  const data = loadData()
  data.cases.unshift({ user, phone, company, category, product, platforms, time: new Date().toISOString() })
  saveData(data)
  res.json({ success: true })
})

// SPA fallback — Express 5 compatible
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  } else {
    next()
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  if (!fs.existsSync(DATA_FILE)) saveData({ users: [], cases: [] })
})
