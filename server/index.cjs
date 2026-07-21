const express = require('express')
const path = require('path')
const cors = require('cors')
const mongoose = require('mongoose')

const app = express()
const PORT = process.env.PORT || 3000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/product-promo'
const DIST_DIR = path.join(__dirname, '..', 'dist')

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// ── Mongoose models ──

const UserSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, required: true },
  company: String,
  category: String,
  account: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

const CaseSchema = new mongoose.Schema({
  user: String,
  phone: String,
  company: String,
  category: String,
  product: String,
  platforms: [String],
  createdAt: { type: Date, default: Date.now }
})

const User = mongoose.model('User', UserSchema)
const Case = mongoose.model('Case', CaseSchema)

// ── Serve static frontend ──

app.use(express.static(DIST_DIR))

// ── API routes ──

// GET /api/data — all users & cases (for admin)
app.get('/api/data', async (req, res) => {
  try {
    const [users, cases] = await Promise.all([
      User.find().select('-password').lean(),
      Case.find().sort({ createdAt: -1 }).lean()
    ])
    res.json({ users, cases })
  } catch (err) {
    res.status(500).json({ error: '数据读取失败' })
  }
})

// POST /api/register
app.post('/api/register', async (req, res) => {
  const { name, phone, company, category, account, password } = req.body
  if (!phone || !account || !password) {
    return res.status(400).json({ error: '手机号、账号、密码为必填项' })
  }
  try {
    const exists = await User.findOne({ account })
    if (exists) return res.status(400).json({ error: '该账号已被注册' })
    const user = await User.create({ name, phone, company, category, account, password })
    res.json({ success: true, user: { ...user.toObject(), password: undefined } })
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: '该账号已被注册' })
    res.status(500).json({ error: '注册失败' })
  }
})

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { account, password } = req.body
  try {
    const user = await User.findOne({ account, password })
    if (!user) return res.status(401).json({ error: '账号或密码错误' })
    res.json({ success: true, user: { ...user.toObject(), password: undefined } })
  } catch (err) {
    res.status(500).json({ error: '登录失败' })
  }
})

// POST /api/cases
app.post('/api/cases', async (req, res) => {
  const { user, phone, company, category, product, platforms } = req.body
  try {
    await Case.create({ user, phone, company, category, product, platforms })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: '记录失败' })
  }
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

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected')
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message)
    process.exit(1)
  })
