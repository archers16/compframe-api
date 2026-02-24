// CompFrame AI Pipeline - Decomposed Analysis (Railway)
// No timeout constraints. Runs the full pipeline:
//   Phase A: Strategic Foundation (qualitative decisions)
//   Phase B: Numerical Contract (all numbers locked)
//   Phase C: Rationale & Operations (explanations + operational design)
//   Validation + Auto-Fix
//   5 Parallel Group Calls (formatting into deliverables)
//   Group Validation + Force-Align
//   Merge + Save to Supabase

import { createClient } from '@supabase/supabase-js'
import { callClaudeJSON } from './lib/claude.js'
import { buildPhaseASystemPrompt, buildPhaseAUserPrompt } from './lib/phase-a-prompt.js'
import { buildPhaseBSystemPrompt, buildPhaseBUserPrompt } from './lib/phase-b-prompt.js'
import { buildPhaseCSystemPrompt, buildPhaseCUserPrompt } from './lib/phase-c-prompt.js'
import { GROUP_DEFINITIONS } from './lib/group-prompts.js'
import { validateContract, autoFixContract, validateGroupOutput, forceAlignGroupA } from './lib/validation.js'
import { buildUserPrompt } from './lib/user-prompt.js'

const MODEL_PRIMARY = 'claude-sonnet-4-5-20250929'
const MODEL_FALLBACK = 'claude-sonnet-4-5-20250929'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function updateStatus(supabase, planId, stage, detail) {
  if (!supabase || !planId) return
  try {
    await supabase
      .from('plans')
      .update({ generation_stage: stage, generation_detail: detail })
      .eq('id', planId)
  } catch (err) {
    console.error('Status update failed:', err.message)
  }
}

/**
 * Estimate plan count from intake data.
 * Tries multiple approaches since _plan_count metadata may not be set.
 */
function estimatePlanCount(intake) {
  // 1. Explicit metadata
  if (intake._plan_count && intake._plan_count > 0) return intake._plan_count

  // 2. Combo details array
  if (intake._combo_details?.length > 0) return intake._combo_details.length

  // 3. Count roles array if present
  if (Array.isArray(intake.roles)) return Math.max(intake.roles.length, 1)
  if (Array.isArray(intake.plans)) return Math.max(intake.plans.length, 1)

  // 4. Count role-like keys (role_1, role_2, etc.)
  const roleKeys = Object.keys(intake).filter(k => /^role_\d+/.test(k))
  if (roleKeys.length > 0) return roleKeys.length

  // 5. Scan for roles in nested objects
  for (const key of Object.keys(intake)) {
    const val = intake[key]
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (Array.isArray(val.roles)) return Math.max(val.roles.length, 1)
    }
  }

  // 6. Count occurrences of role-segment patterns in stringified data
  try {
    const str = JSON.stringify(intake)
    const matches = str.match(/"role_key"\s*:/g) || str.match(/"role_name"\s*:/g) || []
    if (matches.length > 0) return matches.length
  } catch (e) { /* ignore */ }

  return 1
}

/**
 * Centralized token budget calculator.
 * Three tiers: small (1-5 plans), medium (6-12), large (13-25).
 */
function getTokenBudgets(planCount) {
  if (planCount > 12) {
    // Large tier: 13-25 plans
    return { phaseA: 32768, phaseB: 32768, phaseC: 20480, groupA: 32768, groupE: 32768 }
  } else if (planCount > 5) {
    // Medium tier: 6-12 plans
    return { phaseA: 24576, phaseB: 24576, phaseC: 16384, groupA: 24576, groupE: 24576 }
  } else if (planCount > 2) {
    // Mid-small tier: 3-5 plans
    return { phaseA: 16384, phaseB: 16384, phaseC: 12288, groupA: 16384, groupE: 16384 }
  } else {
    // Small tier: 1-2 plans
    return { phaseA: 12288, phaseB: 16384, phaseC: 12288, groupA: 16384, groupE: 16384 }
  }
}

/**
 * Run a single phase with retry logic.
 * Returns { output, activeModel, ms }
 */
async function runPhase({ name, systemPrompt, userPrompt, apiKey, maxTokens, model, supabase, planId, stage, detail, retryDetail }) {
  await updateStatus(supabase, planId, stage, detail)
  console.log(`[Pipeline] Starting ${name} (maxTokens: ${maxTokens})`)
  const start = Date.now()

  let output
  let activeModel = model

  try {
    output = await callClaudeJSON({
      systemPrompt,
      userPrompt,
      apiKey,
      maxTokens,
      model,
      noRetry: true,
    })
  } catch (err) {
    console.error(`[Pipeline] ${name} failed:`, err.message)
    if (err.responseText) {
      console.error(`[Pipeline] ${name} response preview:`, err.responseText.substring(0, 500))
    }

    const isOverload = err.message?.includes('529') || err.message?.includes('overload') || err.message?.includes('rate')
    const retryModel = isOverload ? MODEL_FALLBACK : model
    activeModel = retryModel

    await updateStatus(supabase, planId, stage, retryDetail || `${name} failed. Retrying...`)

    try {
      output = await callClaudeJSON({
        systemPrompt,
        userPrompt,
        apiKey,
        maxTokens,
        model: retryModel,
        noRetry: true,
      })
    } catch (retryErr) {
      console.error(`[Pipeline] ${name} retry failed:`, retryErr.message)
      throw new Error(`${name} failed after retry`)
    }
  }

  const ms = Date.now() - start
  console.log(`[Pipeline] ${name} complete in ${(ms / 1000).toFixed(1)}s`)
  return { output, activeModel, ms }
}

export async function runPipeline(intake, planId) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('API key not configured')

  const supabase = getSupabase()
  const pipelineStart = Date.now()

  try {
    // ============================================================
    // STEP 1: Build intake context
    // ============================================================
    const intakeContext = buildUserPrompt(intake)

    const combos = intake._combo_details || []
    const planCount = estimatePlanCount(intake)
    const metadata = {
      isMultiSegment: intake._is_multi_segment || false,
      hasVariants: intake._has_variants || false,
      planCount,
    }

    console.log(`[Pipeline] Plan count: ${metadata.planCount}, multi-segment: ${metadata.isMultiSegment}, variants: ${metadata.hasVariants}`)

    const tokenBudgets = getTokenBudgets(metadata.planCount)
    const tier = metadata.planCount > 12 ? 'large' : metadata.planCount > 5 ? 'medium' : metadata.planCount > 2 ? 'mid-small' : 'small'
    console.log(`[Pipeline] Token tier: ${tier} (Phase A: ${tokenBudgets.phaseA}, Phase B: ${tokenBudgets.phaseB}, Phase C: ${tokenBudgets.phaseC})`)

    // ============================================================
    // STEP 2: Phase A -- Strategic Foundation
    // ============================================================
    const phaseA = await runPhase({
      name: 'Phase A (Strategic Foundation)',
      systemPrompt: buildPhaseASystemPrompt(),
      userPrompt: buildPhaseAUserPrompt(intakeContext, metadata),
      apiKey,
      maxTokens: tokenBudgets.phaseA,
      model: MODEL_PRIMARY,
      supabase,
      planId,
      stage: 'analysis',
      detail: 'Phase 1/3: Analyzing strategy and role architecture...',
      retryDetail: 'Strategy analysis failed. Retrying...',
    })

    const phaseAOutput = phaseA.output
    let activeModel = phaseA.activeModel

    // Validate Phase A has required structure
    if (!phaseAOutput?.strategic_analysis || !phaseAOutput?.role_architecture?.roles?.length) {
      console.error('[Pipeline] Phase A missing required fields:', Object.keys(phaseAOutput || {}))
      throw new Error('Phase A produced incomplete output (missing strategic_analysis or role_architecture)')
    }

    console.log(`[Pipeline] Phase A produced ${phaseAOutput.role_architecture.roles.length} role(s)`)

    // ============================================================
    // STEP 3: Phase B -- Numerical Contract
    // ============================================================
    const phaseB = await runPhase({
      name: 'Phase B (Numerical Contract)',
      systemPrompt: buildPhaseBSystemPrompt(),
      userPrompt: buildPhaseBUserPrompt(intakeContext, phaseAOutput, metadata),
      apiKey,
      maxTokens: tokenBudgets.phaseB,
      model: activeModel,
      supabase,
      planId,
      stage: 'analysis',
      detail: 'Phase 2/3: Locking numerical contract...',
      retryDetail: 'Numerical contract failed. Retrying...',
    })

    const phaseBOutput = phaseB.output

    // Validate Phase B has numerical_contract with roles
    if (!phaseBOutput?.numerical_contract?.roles?.length) {
      console.error('[Pipeline] Phase B missing numerical_contract.roles:', Object.keys(phaseBOutput || {}))
      throw new Error('Phase B produced incomplete output (missing numerical_contract)')
    }

    console.log(`[Pipeline] Phase B produced ${phaseBOutput.numerical_contract.roles.length} role(s) in contract`)

    // ============================================================
    // STEP 4: Validate and auto-fix the numerical contract
    // ============================================================
    await updateStatus(supabase, planId, 'validation', 'Validating numerical contract...')

    const contractValidation = validateContract(phaseBOutput.numerical_contract)
    console.log(`[Pipeline] Contract validation: ${contractValidation.valid ? 'PASSED' : 'FAILED'} (${contractValidation.errors.length} errors, ${contractValidation.warnings.length} warnings)`)

    if (contractValidation.errors.length > 0) {
      console.log('[Pipeline] Contract errors:', contractValidation.errors.map(e => e.message))
    }

    if (!contractValidation.valid) {
      console.log('[Pipeline] Auto-fixing contract...')
      phaseBOutput.numerical_contract = autoFixContract(phaseBOutput.numerical_contract)

      const revalidation = validateContract(phaseBOutput.numerical_contract)
      console.log(`[Pipeline] Post-fix validation: ${revalidation.valid ? 'PASSED' : 'STILL HAS ERRORS'}`)
      if (!revalidation.valid) {
        console.warn('[Pipeline] Remaining errors after auto-fix:', revalidation.errors.map(e => e.message))
      }
    }

    // ============================================================
    // STEP 5: Phase C -- Rationale & Operations
    // ============================================================
    const phaseC = await runPhase({
      name: 'Phase C (Rationale & Operations)',
      systemPrompt: buildPhaseCSystemPrompt(),
      userPrompt: buildPhaseCUserPrompt(intakeContext, phaseAOutput, phaseBOutput, metadata),
      apiKey,
      maxTokens: tokenBudgets.phaseC,
      model: activeModel,
      supabase,
      planId,
      stage: 'analysis',
      detail: 'Phase 3/3: Building rationale and operations...',
      retryDetail: 'Rationale phase failed. Retrying...',
    })

    const phaseCOutput = phaseC.output

    // Validate Phase C has required fields
    if (!phaseCOutput?.role_analysis || !phaseCOutput?.operational_analysis) {
      console.warn('[Pipeline] Phase C missing some fields:', Object.keys(phaseCOutput || {}))
      // Phase C is less critical; we can proceed with partial output
    }

    const totalAnalysisMs = phaseA.ms + phaseB.ms + phaseC.ms
    console.log(`[Pipeline] All analysis phases complete in ${(totalAnalysisMs / 1000).toFixed(1)}s (A: ${(phaseA.ms / 1000).toFixed(1)}s, B: ${(phaseB.ms / 1000).toFixed(1)}s, C: ${(phaseC.ms / 1000).toFixed(1)}s)`)

    // ============================================================
    // STEP 6: Merge phase outputs into unified analysisOutput
    // (must match the shape that group prompts expect)
    // ============================================================
    const analysisOutput = {
      numerical_contract: phaseBOutput.numerical_contract,
      strategic_analysis: phaseAOutput.strategic_analysis,
      role_analysis: phaseCOutput?.role_analysis || {},
      operational_analysis: phaseCOutput?.operational_analysis || {},
      scenarios: phaseCOutput?.scenarios || [],
      global_warnings: phaseCOutput?.global_warnings || [],
      assumptions: phaseCOutput?.assumptions || [],
    }

    // ============================================================
    // STEP 7: Parallel group generation
    // ============================================================
    await updateStatus(supabase, planId, 'generating', 'Building plan deliverables...')

    const groupIds = Object.keys(GROUP_DEFINITIONS)
    console.log(`[Pipeline] Starting ${groupIds.length} parallel group calls`)
    const groupStart = Date.now()

    // Override group token limits for large orgs
    const groupTokenOverrides = {
      A: tokenBudgets.groupA,
      E: tokenBudgets.groupE,
    }

    const groupResults = await Promise.allSettled(
      groupIds.map(async (groupId) => {
        const group = GROUP_DEFINITIONS[groupId]
        const groupStartTime = Date.now()
        const maxTokens = groupTokenOverrides[groupId] || group.maxTokens

        try {
          const result = await callClaudeJSON({
            systemPrompt: group.buildSystemPrompt(),
            userPrompt: group.buildUserPrompt(intakeContext, analysisOutput),
            apiKey,
            maxTokens,
            model: activeModel,
          })

          const groupMs = Date.now() - groupStartTime
          console.log(`[Pipeline] Group ${groupId} (${group.name}) complete in ${(groupMs / 1000).toFixed(1)}s`)
          return { groupId, result }
        } catch (err) {
          const groupMs = Date.now() - groupStartTime
          console.error(`[Pipeline] Group ${groupId} (${group.name}) failed after ${(groupMs / 1000).toFixed(1)}s:`, err.message)
          throw { groupId, error: err }
        }
      })
    )

    const groupMs = Date.now() - groupStart
    console.log(`[Pipeline] All groups complete in ${(groupMs / 1000).toFixed(1)}s`)

    // ============================================================
    // STEP 8: Collect results, retry failures
    // ============================================================
    const successfulGroups = {}
    const failedGroupIds = []

    for (const result of groupResults) {
      if (result.status === 'fulfilled') {
        const { groupId, result: groupOutput } = result.value
        successfulGroups[groupId] = groupOutput
      } else {
        const failedId = result.reason?.groupId || 'unknown'
        failedGroupIds.push(failedId)
      }
    }

    console.log(`[Pipeline] ${Object.keys(successfulGroups).length}/${groupIds.length} groups succeeded`)

    if (failedGroupIds.length > 0) {
      console.log(`[Pipeline] Retrying ${failedGroupIds.length} failed groups: ${failedGroupIds.join(', ')}`)
      await updateStatus(supabase, planId, 'generating', `Retrying ${failedGroupIds.length} section(s)...`)

      for (const groupId of failedGroupIds) {
        const group = GROUP_DEFINITIONS[groupId]
        if (!group) continue
        const maxTokens = groupTokenOverrides[groupId] || group.maxTokens

        try {
          const retryResult = await callClaudeJSON({
            systemPrompt: group.buildSystemPrompt(),
            userPrompt: group.buildUserPrompt(intakeContext, analysisOutput),
            apiKey,
            maxTokens,
            model: activeModel,
          })
          successfulGroups[groupId] = retryResult
          console.log(`[Pipeline] Group ${groupId} retry succeeded`)
        } catch (err) {
          console.error(`[Pipeline] Group ${groupId} retry failed:`, err.message)
        }
      }
    }

    // ============================================================
    // STEP 9: Validate group outputs
    // ============================================================
    await updateStatus(supabase, planId, 'validation', 'Running consistency checks...')

    for (const [groupId, groupOutput] of Object.entries(successfulGroups)) {
      const validation = validateGroupOutput(groupId, groupOutput, analysisOutput.numerical_contract)

      if (!validation.valid) {
        console.warn(`[Pipeline] Group ${groupId} validation:`, validation.errors.length, 'errors')

        if (groupId === 'A') {
          console.log('[Pipeline] Force-aligning Group A to contract')
          successfulGroups[groupId] = forceAlignGroupA(groupOutput, analysisOutput.numerical_contract)
        }
      }
    }

    // ============================================================
    // STEP 10: Merge into final recommendations
    // ============================================================
    await updateStatus(supabase, planId, 'finalizing', 'Assembling final plan...')

    const recommendations = mergeRecommendations(analysisOutput, successfulGroups)

    // ============================================================
    // STEP 11: Save to Supabase
    // ============================================================
    const totalMs = Date.now() - pipelineStart
    console.log(`[Pipeline] Total time: ${(totalMs / 1000).toFixed(1)}s (analysis phases: ${(totalAnalysisMs / 1000).toFixed(1)}s, groups: ${(groupMs / 1000).toFixed(1)}s)`)
    console.log(`[Pipeline] Groups completed: ${recommendations._groups_completed.join(', ')}`)
    if (recommendations._groups_failed.length > 0) {
      console.warn(`[Pipeline] Groups failed: ${recommendations._groups_failed.join(', ')}`)
    }

    if (planId && supabase) {
      const { error: updateError } = await supabase
        .from('plans')
        .update({
          recommendations,
          name: recommendations.plan_name || undefined,
          status: 'complete',
          generation_stage: 'complete',
          generation_detail: `Generated in ${Math.round(totalMs / 1000)}s`,
        })
        .eq('id', planId)

      if (updateError) console.error('[Pipeline] Supabase save error:', updateError)
    }

    console.log(`[Pipeline] Plan ${planId} complete`)
    return recommendations

  } catch (err) {
    console.error('[Pipeline] Error:', err?.message || err)
    if (planId && supabase) {
      try {
        await supabase.from('plans').update({
          status: 'error',
          generation_stage: 'error',
          generation_detail: err?.message || 'Unexpected error during generation',
        }).eq('id', planId)
      } catch (_) {}
    }
    throw err
  }
}


/**
 * Merge analysis + group outputs into final recommendations JSON.
 */
function mergeRecommendations(analysisOutput, groups) {
  const recs = {}
  const contract = analysisOutput.numerical_contract

  // Group A: roles + cost_model
  if (groups.A) {
    recs.roles = groups.A.roles || {}
    recs.cost_model = groups.A.cost_model || {}
  } else {
    recs.roles = buildFallbackRoles(contract)
    recs.cost_model = buildFallbackCostModel(contract)
  }

  // Group B: executive_briefing + benchmarking + baseline_comparison
  if (groups.B) {
    recs.executive_briefing = groups.B.executive_briefing || {}
    recs.benchmarking = groups.B.benchmarking || {}
    recs.baseline_comparison = groups.B.baseline_comparison || {}
  }

  // Group C: operations
  if (groups.C) {
    recs.crediting_rules = groups.C.crediting_rules || {}
    recs.quota_methodology = groups.C.quota_methodology || {}
    recs.governance = groups.C.governance || {}
    recs.payout_mechanics = groups.C.payout_mechanics || {}
    recs.cross_role_alignment = groups.C.cross_role_alignment || {}
    recs.spif_suggestions = groups.C.spif_suggestions || []
  }

  // Group D: diagnostics
  if (groups.D) {
    recs.anti_patterns_detected = groups.D.anti_patterns_detected || []
    recs.scenarios = groups.D.scenarios || []
    recs.global_warnings = groups.D.global_warnings || []
    recs.assumptions = groups.D.assumptions || []
  }

  // Group E: communication + slides + metadata
  if (groups.E) {
    recs.plan_name = groups.E.plan_name || analysisOutput.strategic_analysis?.plan_name || 'Compensation Plan'
    recs.summary = groups.E.summary || analysisOutput.strategic_analysis?.summary || ''
    recs.confidence_level = groups.E.confidence_level || analysisOutput.strategic_analysis?.confidence_level || 'Medium'
    recs.confidence_note = groups.E.confidence_note || analysisOutput.strategic_analysis?.confidence_note || ''
    recs.implementation = groups.E.implementation || {}
    recs.transition_plan = groups.E.transition_plan || {}
    recs.slide_content = groups.E.slide_content || {}
  } else {
    recs.plan_name = analysisOutput.strategic_analysis?.plan_name || 'Compensation Plan'
    recs.summary = analysisOutput.strategic_analysis?.summary || ''
    recs.confidence_level = analysisOutput.strategic_analysis?.confidence_level || 'Medium'
    recs.confidence_note = analysisOutput.strategic_analysis?.confidence_note || ''
  }

  if (analysisOutput.strategic_analysis?.readiness_assessment) {
    recs.readiness_assessment = analysisOutput.strategic_analysis.readiness_assessment
  }

  recs._numerical_contract = contract
  recs._pipeline_version = 3
  recs._groups_completed = Object.keys(groups)
  recs._groups_failed = Object.keys(GROUP_DEFINITIONS).filter(g => !groups[g])

  if (recs.executive_briefing?.comp_philosophy) {
    recs.comp_philosophy = recs.executive_briefing.comp_philosophy
  }

  return recs
}

function buildFallbackRoles(contract) {
  if (!contract?.roles) return {}

  const roles = {}
  for (const cr of contract.roles) {
    roles[cr.role_key] = {
      role_name: cr.role_name,
      ote: {
        recommended: cr.ote,
        range_low: cr.ote_range_low,
        range_high: cr.ote_range_high,
        rationale: 'Generated from numerical contract (full formatting unavailable)',
      },
      pay_mix: {
        base_pct: cr.base_pct,
        variable_pct: cr.variable_pct,
        rationale: '',
      },
      measures: (cr.measures || []).map(m => ({
        name: m.name,
        weight_pct: m.weight_pct,
        measurement_period: m.measurement_period,
        description: '',
      })),
      quota: {
        methodology: cr.quota_methodology,
        multiple: cr.quota_variable_multiple,
        period: cr.quota_period,
        rationale: '',
      },
      accelerators: {
        structure: cr.accelerator_tiers?.map(t =>
          `${t.min_attainment_pct}-${t.max_attainment_pct || ''}%: ${t.multiplier_display || t.multiplier + 'x'}`
        ).join(', ') || '',
        multiplier: cr.accelerator_tiers?.length
          ? cr.accelerator_tiers[cr.accelerator_tiers.length - 1].multiplier
          : 1,
        threshold_pct: 100,
        rationale: '',
      },
      decelerators: {
        recommended: cr.has_decelerator,
        structure: null,
        rationale: '',
      },
      ramp: {
        duration_months: cr.ramp_months,
        structure: '',
        draw_type: cr.draw_type,
        rationale: '',
      },
      cap_policy: {
        type: cr.cap_policy,
        detail: cr.cap_detail,
        rationale: '',
      },
      clawback: {
        recommended: cr.has_clawback,
        structure: null,
        rationale: '',
      },
      payout_frequency: cr.payout_frequency,
      behavioral_note: '',
      warnings: [],
    }
  }
  return roles
}

function buildFallbackCostModel(contract) {
  if (!contract?.company_level) return {}

  const cl = contract.company_level
  return {
    total_ote_at_target: cl.total_ote_at_target,
    total_cost_80pct: cl.total_cost_80pct,
    total_cost_120pct: cl.total_cost_120pct,
    total_cost_150pct: cl.total_cost_150pct,
    base_salary_total: cl.total_base_salary,
    variable_at_target_total: cl.total_variable_at_target,
    cost_of_sales_pct: cl.cost_of_sales_display || (cl.cost_of_sales_pct ? `${cl.cost_of_sales_pct}%` : null),
    headcount_summary: `${cl.total_headcount} total positions`,
    segment_subtotals: cl.segment_subtotals || null,
    budget_notes: null,
  }
}
