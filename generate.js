// CompFrame AI Pipeline - Unified (Railway)
// No timeout constraints. Runs the full pipeline in one pass:
//   1. Analysis Layer (strategic decisions + numerical contract)
//   2. Contract Validation + Auto-Fix
//   3. 5 Parallel Group Calls (formatting analysis into deliverables)
//   4. Group Output Validation + Force-Align
//   5. Merge into final recommendations JSON
//   6. Save to Supabase

import { createClient } from '@supabase/supabase-js'
import { callClaudeJSON } from './lib/claude.js'
import { buildAnalysisSystemPrompt, buildAnalysisUserPrompt } from './lib/analysis-prompt.js'
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
    const metadata = {
      isMultiSegment: intake._is_multi_segment || false,
      hasVariants: intake._has_variants || false,
      planCount: intake._plan_count || combos.length || 1,
    }

    // ============================================================
    // STEP 2: Analysis Layer
    // ============================================================
    await updateStatus(supabase, planId, 'analysis', 'Analyzing compensation structure across 21 modules...')

    console.log(`[Pipeline] Starting analysis for plan ${planId} (${metadata.planCount} plans)`)
    const analysisStart = Date.now()

    let analysisOutput
    let activeModel = MODEL_PRIMARY

    try {
      analysisOutput = await callClaudeJSON({
        systemPrompt: buildAnalysisSystemPrompt(),
        userPrompt: buildAnalysisUserPrompt(intakeContext, metadata),
        apiKey,
        maxTokens: 16384,
        model: MODEL_PRIMARY,
      })
    } catch (err) {
      console.error('[Pipeline] Analysis failed:', err.message)
      const isOverload = err.message?.includes('529') || err.message?.includes('overload') || err.message?.includes('rate')

      const retryModel = isOverload ? MODEL_FALLBACK : MODEL_PRIMARY
      activeModel = retryModel

      if (isOverload) {
        console.log('[Pipeline] Primary model overloaded, falling back')
        await updateStatus(supabase, planId, 'analysis', 'Primary model busy, using backup model...')
      } else {
        await updateStatus(supabase, planId, 'analysis', 'Analysis failed. Retrying...')
      }

      try {
        analysisOutput = await callClaudeJSON({
          systemPrompt: buildAnalysisSystemPrompt(),
          userPrompt: buildAnalysisUserPrompt(intakeContext, metadata),
          apiKey,
          maxTokens: 16384,
          model: retryModel,
        })
      } catch (retryErr) {
        console.error('[Pipeline] Analysis retry failed:', retryErr.message)
        if (planId && supabase) {
          try {
            await supabase.from('plans').update({
              status: 'error',
              generation_stage: 'error',
              generation_detail: 'Analysis phase failed after retry. Please try again.',
            }).eq('id', planId)
          } catch (_) {}
        }
        throw new Error('Analysis phase failed after retry')
      }
    }

    const analysisMs = Date.now() - analysisStart
    console.log(`[Pipeline] Analysis complete in ${(analysisMs / 1000).toFixed(1)}s`)

    // Validate structure
    if (!analysisOutput?.numerical_contract || !analysisOutput?.strategic_analysis) {
      console.error('[Pipeline] Analysis missing required fields:', Object.keys(analysisOutput || {}))
      if (planId && supabase) {
        try {
          await supabase.from('plans').update({
            status: 'error',
            generation_stage: 'error',
            generation_detail: 'Analysis produced incomplete output. Please try again.',
          }).eq('id', planId)
        } catch (_) {}
      }
      throw new Error('Analysis produced incomplete output')
    }

    // ============================================================
    // STEP 3: Validate and auto-fix the numerical contract
    // ============================================================
    await updateStatus(supabase, planId, 'validation', 'Validating numerical contract...')

    const contractValidation = validateContract(analysisOutput.numerical_contract)
    console.log(`[Pipeline] Contract validation: ${contractValidation.valid ? 'PASSED' : 'FAILED'} (${contractValidation.errors.length} errors, ${contractValidation.warnings.length} warnings)`)

    if (contractValidation.errors.length > 0) {
      console.log('[Pipeline] Contract errors:', contractValidation.errors.map(e => e.message))
    }

    if (!contractValidation.valid) {
      console.log('[Pipeline] Auto-fixing contract...')
      analysisOutput.numerical_contract = autoFixContract(analysisOutput.numerical_contract)

      const revalidation = validateContract(analysisOutput.numerical_contract)
      console.log(`[Pipeline] Post-fix validation: ${revalidation.valid ? 'PASSED' : 'STILL HAS ERRORS'}`)
      if (!revalidation.valid) {
        console.warn('[Pipeline] Remaining errors after auto-fix:', revalidation.errors.map(e => e.message))
      }
    }

    // ============================================================
    // STEP 4: Parallel group generation
    // ============================================================
    await updateStatus(supabase, planId, 'generating', 'Building plan deliverables...')

    const groupIds = Object.keys(GROUP_DEFINITIONS)
    console.log(`[Pipeline] Starting ${groupIds.length} parallel group calls`)
    const groupStart = Date.now()

    const groupResults = await Promise.allSettled(
      groupIds.map(async (groupId) => {
        const group = GROUP_DEFINITIONS[groupId]
        const groupStartTime = Date.now()

        try {
          const result = await callClaudeJSON({
            systemPrompt: group.buildSystemPrompt(),
            userPrompt: group.buildUserPrompt(intakeContext, analysisOutput),
            apiKey,
            maxTokens: group.maxTokens,
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
    // STEP 5: Collect results, retry failures
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

        try {
          const retryResult = await callClaudeJSON({
            systemPrompt: group.buildSystemPrompt(),
            userPrompt: group.buildUserPrompt(intakeContext, analysisOutput),
            apiKey,
            maxTokens: group.maxTokens,
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
    // STEP 6: Validate group outputs
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
    // STEP 7: Merge into final recommendations
    // ============================================================
    await updateStatus(supabase, planId, 'finalizing', 'Assembling final plan...')

    const recommendations = mergeRecommendations(analysisOutput, successfulGroups)

    // ============================================================
    // STEP 8: Save to Supabase
    // ============================================================
    const totalMs = Date.now() - pipelineStart
    console.log(`[Pipeline] Total time: ${(totalMs / 1000).toFixed(1)}s (analysis: ${(analysisMs / 1000).toFixed(1)}s, groups: ${(groupMs / 1000).toFixed(1)}s)`)
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
  recs._pipeline_version = 2
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
