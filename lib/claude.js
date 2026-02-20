// Shared Claude API client with streaming support
// Used by the pipeline orchestrator for all API calls

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'

/**
 * Call Claude API with streaming, accumulate full response text.
 * Returns parsed JSON if the response contains valid JSON, otherwise returns raw text.
 */
export async function callClaude({ systemPrompt, userPrompt, apiKey, maxTokens = 16384, model = DEFAULT_MODEL }) {
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
    const err = await response.text()
    throw new Error(`Claude API error (${response.status}): ${err}`)
  }

  // Accumulate streamed text
  let fullText = ''
  let sseBuffer = ''
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
        } catch {}
      }
    }
  }

  return fullText
}

/**
 * Parse JSON from Claude's response text.
 * Handles cases where Claude wraps JSON in markdown code fences or adds preamble.
 */
export function parseJSON(text) {
  // Try direct parse first
  try {
    return JSON.parse(text.trim())
  } catch {}

  // Try extracting JSON from code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {}
  }

  // Try extracting the largest JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {}
  }

  return null
}

/**
 * Call Claude and parse JSON response. Retries once on parse failure unless noRetry is set.
 */
export async function callClaudeJSON({ systemPrompt, userPrompt, apiKey, maxTokens = 16384, model = DEFAULT_MODEL, noRetry = false }) {
  const text = await callClaude({ systemPrompt, userPrompt, apiKey, maxTokens, model })
  const parsed = parseJSON(text)

  if (parsed) return parsed

  // Try to repair truncated JSON (common with large outputs hitting maxTokens)
  const repaired = repairTruncatedJSON(text)
  if (repaired) {
    console.warn('[Claude] Repaired truncated JSON output')
    return repaired
  }

  if (noRetry) {
    throw new Error('Failed to parse JSON from Claude response (no retry)')
  }

  // One retry with stricter instruction
  const retryText = await callClaude({
    systemPrompt,
    userPrompt: userPrompt + '\n\nCRITICAL: Your previous response was not valid JSON. Respond with ONLY a valid JSON object. No markdown, no explanation, no code fences. Just the raw JSON.',
    apiKey,
    maxTokens,
    model,
  })
  const retryParsed = parseJSON(retryText)
  if (!retryParsed) {
    const retryRepaired = repairTruncatedJSON(retryText)
    if (retryRepaired) return retryRepaired
    throw new Error('Failed to parse JSON from Claude response after retry')
  }
  return retryParsed
}

/**
 * Attempt to repair truncated JSON by closing open braces/brackets.
 */
function repairTruncatedJSON(text) {
  if (!text) return null
  // Extract the JSON portion
  let json = text.trim()
  const fenceMatch = json.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/)
  if (fenceMatch) json = fenceMatch[1].trim()
  const startIdx = json.indexOf('{')
  if (startIdx < 0) return null
  json = json.slice(startIdx)

  // Count open/close braces and brackets
  let braces = 0, brackets = 0
  let inString = false, escape = false
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

  // Remove trailing partial content (incomplete key-value pair)
  json = json.replace(/,\s*"[^"]*"?\s*:?\s*[^}\]]*$/, '')
  // Also handle trailing comma
  json = json.replace(/,\s*$/, '')

  // Close remaining open brackets and braces
  while (brackets > 0) { json += ']'; brackets-- }
  while (braces > 0) { json += '}'; braces-- }

  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}
