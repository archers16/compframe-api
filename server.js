// CompFrame API Server (Railway)
// Long-running Express server for AI generation pipeline.
// No timeout constraints. Frontend polls Supabase for results.

import express from 'express'
import cors from 'cors'
import { runPipeline } from './generate.js'

const app = express()
const PORT = process.env.PORT || 3001

// CORS: allow Vercel frontend
const ALLOWED_ORIGINS = [
  'https://app.compframe.com',
  'https://compframe-mvp.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true)
    }
    // Also allow any *.vercel.app preview deploys
    if (origin.endsWith('.vercel.app')) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}))

app.use(express.json({ limit: '2mb' }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Generate endpoint: accepts request, returns immediately, runs pipeline in background
app.post('/generate', (req, res) => {
  const { intake, planId } = req.body

  if (!intake) return res.status(400).json({ error: 'Missing intake data' })
  if (!planId) return res.status(400).json({ error: 'Missing planId' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  // Return immediately; pipeline runs in background
  res.status(202).json({ status: 'accepted', planId })

  // Run pipeline (no await: fire and forget)
  runPipeline(intake, planId).catch(err => {
    console.error(`[Server] Pipeline failed for plan ${planId}:`, err.message)
  })
})

app.listen(PORT, () => {
  console.log(`CompFrame API running on port ${PORT}`)
  console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'set' : 'NOT SET'}`)
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'set' : 'NOT SET'}`)
})
