// CompFrame API Server v4 (Railway)
// Long-running Express server for AI generation pipeline.
// No timeout constraints. Frontend polls Supabase for results.

import express from 'express'
import cors from 'cors'
import { runPipeline } from './generate.js'

const app = express()
const PORT = process.env.PORT || 3001

// CORS: allow Vercel frontend and local dev
const ALLOWED_ORIGINS = [
  'https://app.compframe.com',
  'https://compframe-mvp.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true)
    }
    // Also allow any *.vercel.app preview deploys
    if (origin.endsWith('.vercel.app')) return callback(null, true)
    console.warn(`[CORS] Blocked origin: ${origin}`)
    callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}))

app.use(express.json({ limit: '2mb' }))

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'NOT SET',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'NOT SET',
    },
    version: 4,
  })
})

// Test endpoint: validates API key works with a minimal Claude call
app.get('/test', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Respond with just the word "ok"' }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(response.status).json({
        error: `Claude API returned ${response.status}`,
        detail: errText.substring(0, 500),
      })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    res.json({
      status: 'ok',
      model: data.model,
      response: text,
      usage: data.usage,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Generate endpoint: accepts request, returns immediately, runs pipeline in background
app.post('/generate', (req, res) => {
  const { intake, planId } = req.body

  if (!intake) {
    console.error('[Server] Missing intake data in request')
    return res.status(400).json({ error: 'Missing intake data' })
  }
  if (!planId) {
    console.error('[Server] Missing planId in request')
    return res.status(400).json({ error: 'Missing planId' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[Server] ANTHROPIC_API_KEY not set')
    return res.status(500).json({ error: 'API key not configured' })
  }

  // Log intake shape for debugging
  const intakeKeys = Object.keys(intake).filter(k => !k.startsWith('_'))
  console.log(`[Server] Generate request: planId=${planId}, intake keys: ${intakeKeys.length} (${intakeKeys.slice(0, 10).join(', ')}...)`)

  // Basic intake validation
  const hasCompanyData = intake.company_stage || intake.funding_stage
  const hasRoleData = intake.role_types || intake.roles || intake._combo_details
  if (!hasCompanyData && !hasRoleData) {
    console.warn('[Server] Intake appears empty: no company stage or role data found')
  }

  // Return immediately; pipeline runs in background
  res.status(202).json({ status: 'accepted', planId })

  // Run pipeline (no await: fire and forget)
  runPipeline(intake, planId).catch(err => {
    console.error(`[Server] Pipeline failed for plan ${planId}:`, err.message)
  })
})

app.listen(PORT, () => {
  console.log(`CompFrame API v4 running on port ${PORT}`)
  console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'set' : 'NOT SET'}`)
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'set' : 'NOT SET'}`)
  console.log(`Pipeline: Sequential groups, compact JSON, token estimation`)
})
