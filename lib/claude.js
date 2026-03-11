// Shared Claude API client with streaming support
// Used by the pipeline orchestrator for all API calls

const DEFAULT_MODEL = 'claude-sonnet-4-6'

// Rough token estimation: ~4 chars per token for English text/JSON
const CHARS_PER_TOKEN = 4
const MODEL_CONTEXT_LIMIT = 200000 // 200K context window for Sonnet 4
const MODEL_MAX_OUTPUT = 64000 // max output tokens

/**
 * Estimate token count from a string.
 * Rough heuristic: actual BPE tokenization varies but ~4 chars/token is reliable for English + JSON.
 */
export function estimateTokens(text) {
  if (!text) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Check whether a request is likely to fit within the model's context window.
 * Returns { fits, inputTokens, outputBudget, totalEstimate, limit, utilizationPct }
 */
export function checkContextFit(systemPrompt, userPrompt, maxTokens) {
  const inputTokens = estimateTokens(systemPrompt) + estimateTokens(userPrompt)
  const totalEstimate = inputTokens + maxTokens
  return {
    fits: totalEstimate < MODEL_CONTEXT_LIMIT,
    inputTokens,
    outputBudget: maxTokens,
    totalEstimate,
    limit: MODEL_CONTEXT_LIMIT,
    utilizationPct: Math.round((totalEstimate / MODEL_CONTEXT_LIMIT) * 100),
  }
}

/**
 * Call Claude API with streaming, accumulate full response text.
 * Returns { text, stopReason, inputTokensUsed, outputTokensUsed }.
 */
export async function callClaude({ systemPrompt, userPrompt, apiKey, maxTokens = 16384, model = DEFAULT_MODEL }) {
  const systemLen = systemPrompt?.length || 0
  const userLen = userPrompt?.length || 0
  const estInputTokens = estimateTokens(systemPrompt) + estimateTokens(userPrompt)

  console.log(`[Claude] Calling ${model} (maxTokens: ${maxTokens}, system: ${systemLen} chars, user: ${userLen} chars, ~${estInputTokens} input tokens)`)

  // Auto-reduce output budget if approaching context limits
  const fit = checkContextFit(systemPrompt, userPrompt, maxTokens)
  if (!fit.fits) {
    const reducedMax = Math.max(4096, fit.limit - fit.inputTokens - 2000)
    console.warn(`[Claude] Context overflow: ~${fit.totalEstimate} tokens > ${fit.limit} limit. Reducing maxTokens ${maxTokens} -> ${reducedMax}`)
    maxTokens = reducedMax
  } else if (fit.utilizationPct > 80) {
    console.warn(`[Claude] High context utilization: ${fit.utilizationPct}% (~${fit.inputTokens} input + ${maxTokens} output)`)
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error(`[Claude] API error ${response.status} for model ${model}:`, errText.substring(0, 500))
    const err = new Error(`Claude API error (${response.status}): ${errText.substring(0, 200)}`)
    err.statusCode = response.status
    err.responseText = errText
    throw err
  }

  // Accumulate streamed text
  let fullText = ''
  let sseBuffer = ''
  let stopReason = null
  let inputTokensUsed = null
  let outputTokensUsed = null
  const streamReader = response.body.getReader()
  const streamDecoder = new TextDecoder()

  while (true) {
    const { done, value } = await streamReader.read()
    if (done) break
    const chunkStr = streamDecoder.decode(value, { stream: true })
    sseBuffer += chunkStr

    const lines = sseBuffer.split('\n')
    sseBuffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullText += parsed.delta.text
          }
          if (parsed.type === 'message_delta' && parsed.delta?.stop_reason) {
            stopReason = parsed.delta.stop_reason
          }
          if (parsed.type === 'message_delta' && parsed.usage) {
            outputTokensUsed = parsed.usage.output_tokens
          }
          if (parsed.type === 'message_start' && parsed.message?.usage) {
            inputTokensUsed = parsed.message.usage.input_tokens
          }
        } catch {}
      }
    }
  }

  if (stopReason === 'max_tokens') {
    console.warn(`[Claude] OUTPUT TRUNCATED (hit max_tokens). Generated ${fullText.length} chars, ~${estimateTokens(fullText)} tokens`)
  }

  const tokenReport = inputTokensUsed
    ? `input: ${inputTokensUsed}, output: ${outputTokensUsed || '?'}`
    : `~${estimateTokens(fullText)} output tokens (est)`

  console.log(`[Claude] Done: ${fullText.length} chars, stop: ${stopReason || 'unknown'}, ${tokenReport}`)
  return { text: fullText, stopReason, inputTokensUsed, outputTokensUsed }
}

/**
 * Parse JSON from Claude's response text.
 * Handles markdown code fences, preamble text, and other common wrapping.
 */
export function parseJSON(text) {
  let cleaned = text.trim()

  // Strip markdown code fences (even if truncated / no closing ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '')
    cleaned = cleaned.replace(/\n?```\s*$/, '')
  }

  // Try direct parse
  try {
    return JSON.parse(cleaned.trim())
  } catch {}

  // Try extracting JSON from code fences (for fences mid-text)
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {}
  }

  // Try extracting the largest JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {}
  }

  return null
}

/**
 * Call Claude and parse JSON response.
 * Retries once on parse failure unless noRetry is set.
 * Handles truncation via repair, and falls back to retry with stricter instructions.
 */
export async function callClaudeJSON({ systemPrompt, userPrompt, apiKey, maxTokens = 16384, model = DEFAULT_MODEL, noRetry = false }) {
  const result = await callClaude({ systemPrompt, userPrompt, apiKey, maxTokens, model })
  const text = result.text
  const parsed = parseJSON(text)

  if (parsed) return parsed

  // Try to repair truncated JSON (common with large outputs hitting maxTokens)
  if (result.stopReason === 'max_tokens') {
    console.warn('[Claude] Output was truncated, attempting JSON repair...')
  }

  const repaired = repairTruncatedJSON(text)
  if (repaired) {
    console.warn('[Claude] Repaired truncated/malformed JSON output')
    return repaired
  }

  if (noRetry) {
    const err = new Error('Failed to parse JSON from Claude response (no retry)')
    err.responseText = text
    err.stopReason = result.stopReason
    console.error('[Claude] JSON parse failed. Length:', text?.length, 'First 500:', text?.substring(0, 500))
    console.error('[Claude] Last 300:', text?.substring(text.length - 300))
    throw err
  }

  // One retry with stricter instruction
  console.log('[Claude] Retrying with stricter JSON instruction...')
  const retryResult = await callClaude({
    systemPrompt,
    userPrompt: userPrompt + '\n\nCRITICAL: Your previous response was not valid JSON. Respond with ONLY a valid JSON object. No markdown, no explanation, no code fences. Just the raw JSON.',
    apiKey,
    maxTokens,
    model,
  })
  const retryParsed = parseJSON(retryResult.text)
  if (retryParsed) return retryParsed

  const retryRepaired = repairTruncatedJSON(retryResult.text)
  if (retryRepaired) return retryRepaired
  throw new Error('Failed to parse JSON from Claude response after retry')
}

/**
 * Attempt to repair truncated JSON by closing open braces/brackets.
 * Handles mid-string truncation, trailing commas, and partial key-value pairs.
 */
function repairTruncatedJSON(text) {
  if (!text) return null

  let json = text.trim()
  const fenceMatch = json.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/)
  if (fenceMatch) json = fenceMatch[1].trim()
  const startIdx = json.indexOf('{')
  if (startIdx < 0) return null
  json = json.slice(startIdx)

  // First pass: count open/close, detect if we're mid-string
  let braces = 0, brackets = 0, inString = false, escape = false
  for (const ch of json) {
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') braces++
    if (ch === '}') braces--
    if (ch === '[') brackets++
    if (ch === ']') brackets--
  }

  if (braces === 0 && brackets === 0) return null // Not truncated, just invalid

  // If we're mid-string, close the string first
  if (inString) {
    json = json.replace(/"[^"]*$/, '""')
  }

  // Remove trailing partial content
  json = json.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"}\]]*$/, '')
  json = json.replace(/,\s*$/, '')

  // Recount after cleanup
  braces = 0; brackets = 0; inString = false; escape = false
  for (const ch of json) {
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') braces++
    if (ch === '}') braces--
    if (ch === '[') brackets++
    if (ch === ']') brackets--
  }

  // Close remaining open brackets and braces
  while (brackets > 0) { json += ']'; brackets-- }
  while (braces > 0) { json += '}'; braces-- }

  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}
