// Group Prompt Builders -- 5 sequential calls that format the analysis layer output
// into specific sections of the final recommendations JSON.
//
// CRITICAL: These groups do NOT make independent strategic decisions.
// They format and enrich the analysis layer's decisions into the final schema.
// All numbers come from the numerical_contract.
//
// v4: Compact JSON serialization to reduce token usage.
// Each group receives ONLY the analysis sections it needs.

const NUMERICAL_CONSISTENCY_HEADER = `CRITICAL: NUMERICAL CONSISTENCY REQUIREMENT

The numerical_contract below is the SOLE source of truth for all figures.
You MUST:
1. Use ONLY values from the numerical_contract. Do not round, approximate, recalculate, or derive independently.
2. Use "_display" formatted versions in prose (e.g., "10%" not "0.10", "50/50" not "50%/50%").
3. Reference roles by their exact role_name from the contract.
4. If you need a number NOT in the contract, derive it explicitly from contract values and show the math.
5. When showing earnings examples, always anchor to contract values exactly.

`

/**
 * Compact JSON serialization: removes unnecessary whitespace.
 * Saves 30-50% on token usage compared to JSON.stringify(x, null, 2).
 */
function compact(obj) {
  return JSON.stringify(obj)
}

function buildGroupSystemPrompt(groupId, outputDescription) {
  return `You are a compensation plan formatting engine. You are part of a multi-stage pipeline.

Phase 1 (already complete) produced a Numerical Contract and Strategic Analysis with all decisions locked.
Your job is Phase 2: format the analysis into specific deliverable sections.

You produce: ${outputDescription}

RULES:
- Use ONLY the numbers from the numerical_contract. Never invent or recalculate figures.
- Write at consulting-grade quality. This replaces a $15-50K engagement.
- Every claim must be traceable to the analysis or intake data.
- Respond with VALID JSON ONLY. No markdown, no explanation outside JSON.`
}

// ===================================================================
// GROUP A: Roles & Cost Model
// The core plan structure -- one role object per comp plan + cost model
// ===================================================================

export function buildGroupASystemPrompt() {
  return buildGroupSystemPrompt('A', 'the "roles" object (one entry per comp plan) and "cost_model" object')
}

export function buildGroupAUserPrompt(intakeContext, analysisOutput) {
  const contract = compact(analysisOutput.numerical_contract)
  const roleAnalysis = compact(analysisOutput.role_analysis)

  return `${NUMERICAL_CONSISTENCY_HEADER}

[NUMERICAL CONTRACT]
${contract}

[ROLE ANALYSIS]
${roleAnalysis}

[INTAKE CONTEXT]
${intakeContext}

FORMAT INSTRUCTIONS:
Generate the "roles" object and "cost_model" object using the EXACT schema below.
Pull ALL numbers from the numerical_contract. Pull ALL rationales from the role_analysis.

For each role in numerical_contract.roles, create a role object keyed by role_key.

{
  "roles": {
    "ROLE_KEY": {
      "role_name": "from contract.role_name",
      "ote": {
        "recommended": "from contract.ote",
        "range_low": "from contract.ote_range_low",
        "range_high": "from contract.ote_range_high",
        "rationale": "from role_analysis.ote_rationale (2-3 SENTENCES MAX)"
      },
      "pay_mix": {
        "base_pct": "from contract.base_pct",
        "variable_pct": "from contract.variable_pct",
        "rationale": "from role_analysis.pay_mix_rationale (2-3 SENTENCES MAX)"
      },
      "measures": [
        {
          "name": "from contract.measures[].name",
          "weight_pct": "from contract.measures[].weight_pct",
          "measurement_period": "from contract.measures[].measurement_period",
          "description": "1-2 sentences on what this measure is and why. Concise."
        }
      ],
      "quota": {
        "methodology": "from role_analysis.quota_rationale (2-3 SENTENCES describing methodology)",
        "multiple": "SHORT value from contract.quota_variable_multiple. Must be a compact display like '4.0x' or '5x'. NEVER put methodology descriptions here.",
        "period": "from contract.quota_period",
        "rationale": "from role_analysis.quota_rationale (2-3 SENTENCES MAX)"
      },
      "accelerators": {
        "structure": "Build SHORT summary from contract.accelerator_tiers (e.g., '100-120%: 1.25x, 120-150%: 1.5x, 150%+: 2.0x')",
        "tiers": "COPY contract.accelerator_tiers array as-is (each object with min_attainment_pct, max_attainment_pct, multiplier, multiplier_display)",
        "multiplier": "highest multiplier from contract.accelerator_tiers",
        "threshold_pct": 100,
        "rationale": "from role_analysis.accelerator_rationale (2-3 SENTENCES MAX)",
        "behavioral_note": "Optional 1-sentence behavioral impact note or null"
      },
      "decelerators": {
        "recommended": "from contract.has_decelerator",
        "structure": "from role_analysis or null",
        "rationale": "from role_analysis.decelerator_rationale (2-3 SENTENCES MAX)"
      },
      "ramp": {
        "duration_months": "from contract.ramp_months",
        "structure": "Build text from contract.ramp_schedule",
        "draw_type": "from contract.draw_type",
        "rationale": "from role_analysis.ramp_rationale (2-3 SENTENCES MAX)"
      },
      "cap_policy": {
        "type": "from contract.cap_policy",
        "detail": "from contract.cap_detail (1-2 sentences)",
        "rationale": "from role_analysis.cap_rationale (2-3 SENTENCES MAX)"
      },
      "clawback": {
        "recommended": "from contract.has_clawback",
        "structure": "from role_analysis.clawback_structure_description or null",
        "trigger": "What event triggers clawback (e.g., 'Customer churns within 90 days'). null if not recommended.",
        "window_days": "from contract.clawback_window_days. null if not recommended.",
        "clawback_type": "SHORT label from contract.clawback_type (e.g., 'full_clawback', 'pro_rated', 'graduated'). 1-3 words max, NOT a description. null if not recommended.",
        "rationale": "from role_analysis.clawback_rationale (2-3 SENTENCES MAX)"
      },
      "earnings_at_attainment": {
        "at_80": "NUMBER: base_salary + (target_variable * 0.8). Calculate from contract values.",
        "at_100": "NUMBER: contract.ote (base + variable at target)",
        "at_120": "NUMBER: base_salary + (target_variable * accelerated rate at 120%). Use contract accelerator_tiers.",
        "at_150": "NUMBER: base_salary + (target_variable * accelerated rate at 150%). Use contract accelerator_tiers."
      },
      "payout_frequency": "from contract.payout_frequency",
      "behavioral_note": "from role_analysis.behavioral_note",
      "warnings": "from role_analysis.warnings"
    }
  },
  "cost_model": {
    "total_ote_at_target": "NUMBER from contract.company_level",
    "total_cost_80pct": "NUMBER from contract.company_level",
    "total_cost_120pct": "NUMBER from contract.company_level",
    "total_cost_150pct": "NUMBER from contract.company_level",
    "base_salary_total": "NUMBER from contract.company_level.total_base_salary",
    "variable_at_target_total": "NUMBER from contract.company_level.total_variable_at_target",
    "cost_of_sales_pct": "from contract.company_level.cost_of_sales_display or calculate",
    "headcount_summary": "Build from contract roles",
    "segment_subtotals": "from contract.company_level.segment_subtotals or null",
    "budget_notes": "Compare against budget if intake has budget_constraint. null if no budget data."
  }
}

ALL cost_model number fields MUST be numbers, not strings.
ALL earnings_at_attainment fields MUST be numbers, not strings.
ALL "rationale" fields MUST be 2-3 sentences maximum. No multi-paragraph rationales. Be specific and concise.
The accelerators.tiers field MUST be a direct copy of the contract's accelerator_tiers array.
The quota.multiple field MUST be a short display value like "4.0x" -- NEVER a methodology description.
The clawback.clawback_type field MUST be a 1-3 word type label like "full_clawback" or "pro_rated" -- NEVER a sentence.
The warnings field MUST be an array of plain strings, NOT objects.
Respond with VALID JSON ONLY.`
}

// ===================================================================
// GROUP B: Strategy & Benchmarking
// Executive briefing, market positioning, baseline comparison
// ===================================================================

export function buildGroupBSystemPrompt() {
  return buildGroupSystemPrompt('B', '"executive_briefing", "benchmarking", and "baseline_comparison" objects')
}

export function buildGroupBUserPrompt(intakeContext, analysisOutput) {
  const contract = compact(analysisOutput.numerical_contract)
  const strategic = compact(analysisOutput.strategic_analysis)

  return `${NUMERICAL_CONSISTENCY_HEADER}

[NUMERICAL CONTRACT]
${contract}

[STRATEGIC ANALYSIS]
${strategic}

[INTAKE CONTEXT]
${intakeContext}

FORMAT INSTRUCTIONS:
Generate "executive_briefing", "benchmarking", and "baseline_comparison" objects.

TARGET AUDIENCE: Early-stage startup VP Sales or founder. Not a compensation committee. Keep everything concise and actionable.

{
  "executive_briefing": {
    "comp_philosophy": "2-3 SENTENCES summarizing the plan's design philosophy. Reference the specific trade-offs made (e.g., 'aggressive variable to attract hunters' or 'conservative mix for stability during ramp'). Not a board presentation -- a quick orientation for the person reading the plan.",
    "key_design_decisions": "from strategic_analysis.key_design_decisions. Include up to 3 most important decisions. Each needs: decision (1 sentence), rationale (1 sentence). Skip alternatives_considered and risk.",
    "methodology_notes": "1 sentence. Include: 'Built using CompFrame methodology, calibrated against Bridge Group, ICONIQ Growth, CaptivateIQ, and RepVue benchmarks.'"
  },
  "benchmarking": {
    "market_positioning": "1-2 sentences on overall positioning. E.g., 'This plan positions OTE at the 60th percentile to attract experienced reps in a competitive Series B hiring market.'",
    "role_benchmarks": [
      {
        "role": "Role name from contract",
        "ote_vs_market": "e.g., 'At market (50th-60th percentile)'",
        "pay_mix_vs_market": "e.g., 'Standard for role' or 'More aggressive than typical'",
        "notable_deviations": "1 sentence or null"
      }
    ],
    "data_sources": "Benchmark data sourced from Bridge Group 2024 SaaS AE/SDR reports, ICONIQ Growth operating benchmarks, CaptivateIQ compensation trends, and RepVue comp data aggregation."
  },
  "baseline_comparison": {
    "has_baseline": "from strategic_analysis.current_plan_diagnosis.has_baseline",
    "current_plan_assessment": "2-3 sentences. null if no baseline.",
    "change_summary": "from strategic_analysis.current_plan_diagnosis.change_summary. Keep it brief. null if no baseline.",
    "estimated_impact": "1-2 sentences. null if no baseline."
  }
}

Keep everything SHORT. This audience reads on a phone between meetings.
Respond with VALID JSON ONLY.`
}

// ===================================================================
// GROUP C: Operations
// Crediting, quota methodology, governance, payout, cross-role, SPIFs
// ===================================================================

export function buildGroupCSystemPrompt() {
  return buildGroupSystemPrompt('C', '"crediting_rules", "quota_methodology", "governance", "cross_role_alignment" objects')
}

export function buildGroupCUserPrompt(intakeContext, analysisOutput) {
  const contract = compact(analysisOutput.numerical_contract)
  const operational = compact(analysisOutput.operational_analysis)

  return `${NUMERICAL_CONSISTENCY_HEADER}

[NUMERICAL CONTRACT]
${contract}

[OPERATIONAL ANALYSIS]
${operational}

[INTAKE CONTEXT]
${intakeContext}

FORMAT INSTRUCTIONS:
Generate four lean operational objects. TARGET AUDIENCE: early-stage startup (1-10 reps). Keep everything practical and brief. Skip enterprise process documentation.

{
  "crediting_rules": {
    "model": "1 sentence. E.g., 'Primary seller model with override credit for managers.' from operational_analysis",
    "summary": "2-3 sentences covering the key crediting scenarios this team will actually encounter. Skip formal scenario tables."
  },
  "quota_methodology": {
    "recommended_approach": "2-3 sentences on how to set quotas for this team. Practical advice, not a formal process.",
    "calibration_target": "1 sentence. E.g., '60-70% of reps should hit quota in a healthy plan.'"
  },
  "governance": {
    "review_cadence": "1-2 sentences. E.g., 'Review plan quarterly, full redesign annually.'",
    "kpis": "Array of 3-5 STRING items. Each is a KPI name with target. E.g., ['Quota attainment distribution (target: 60-70% of reps at or above)', 'Average deal size trend', 'Ramp time to productivity']. MUST be plain strings, NOT objects."
  },
  "cross_role_alignment": {
    "pipeline_flow": "2-3 sentences on how roles hand off to each other. Reference specific role names from contract. null if single-role plan.",
    "alignment_warnings": "Array of PLAIN STRINGS. 1-2 brief warnings about role overlap or misalignment risks. Empty array if none."
  }
}

CRITICAL FORMAT RULES:
- governance.kpis MUST be an array of plain strings, NOT objects
- cross_role_alignment.alignment_warnings MUST be an array of plain strings
- Keep every field SHORT. This is a startup, not an enterprise.
Respond with VALID JSON ONLY.`
}

// ===================================================================
// GROUP D: Diagnostics & Scenarios
// Anti-patterns, scenarios, warnings, assumptions
// ===================================================================

export function buildGroupDSystemPrompt() {
  return buildGroupSystemPrompt('D', '"scenarios", "global_warnings", and "assumptions"')
}

export function buildGroupDUserPrompt(intakeContext, analysisOutput) {
  const contract = compact(analysisOutput.numerical_contract)
  const strategic = compact(analysisOutput.strategic_analysis)
  const scenarios = compact(analysisOutput.scenarios)

  return `${NUMERICAL_CONSISTENCY_HEADER}

[NUMERICAL CONTRACT]
${contract}

[STRATEGIC ANALYSIS]
${strategic}

[SCENARIOS FROM ANALYSIS]
${scenarios}

[INTAKE CONTEXT]
${intakeContext}

FORMAT INSTRUCTIONS:
Generate lean diagnostic outputs. TARGET AUDIENCE: startup founder or VP Sales. Plain language, no jargon.

{
  "scenarios": [
    {
      "id": "from analysis scenarios[].id",
      "label": "SHORT label, e.g., 'Revenue Miss' or 'Key Hire Departure'",
      "trigger": "1 sentence describing what triggers this scenario",
      "severity": "high or medium",
      "summary": "1-2 sentences on what changes and why it matters",
      "role_impacts": {
        "role_key": {
          "role_name": "from contract role_name",
          "ote": "adjusted OTE number or null if unchanged",
          "base_pct": "adjusted base % or null",
          "accel_note": "1 sentence on accelerator changes or null"
        }
      }
    }
  ],
  "global_warnings": "Array of PLAIN STRINGS. 2-3 warnings max. Each is 1 sentence. Actionable, not theoretical. E.g., 'If fewer than 50% of reps hit quota after Q1, revisit quota targets before Q2.'",
  "assumptions": "Array of PLAIN STRINGS. 3-4 assumptions max. Each is 1 clear sentence. E.g., 'Current ACV of $25K remains stable through the plan year.'"
}

SCENARIO REQUIREMENTS:
- Include exactly 2 scenarios. Pick the 2 highest-impact ones from the analysis.
- Each MUST have at least one numeric adjustment in role_impacts using EXACT numbers from contract
- Skip measure_weights in role_impacts (not needed for this audience)

CRITICAL FORMAT RULES:
- global_warnings MUST be an array of plain strings: ["warning text", "warning text"]
- assumptions MUST be an array of plain strings: ["assumption text", "assumption text"]
- Do NOT use objects with id/statement/danger fields. Plain strings only.

Respond with VALID JSON ONLY.`
}

// ===================================================================
// GROUP E: Communication, Transition & Slides
// Implementation, transition plan, slide content, and top-level metadata
// ===================================================================

export function buildGroupESystemPrompt() {
  return buildGroupSystemPrompt('E', '"implementation", "slide_content", "plan_name", "summary", "confidence_level", and "confidence_note"')
}

export function buildGroupEUserPrompt(intakeContext, analysisOutput) {
  const contract = compact(analysisOutput.numerical_contract)
  const strategic = compact(analysisOutput.strategic_analysis)

  return `${NUMERICAL_CONSISTENCY_HEADER}

[NUMERICAL CONTRACT]
${contract}

[STRATEGIC ANALYSIS]
${strategic}

[INTAKE CONTEXT]
${intakeContext}

FORMAT INSTRUCTIONS:
Generate metadata, a lean implementation guide, and slide content. TARGET AUDIENCE: startup founder or VP Sales rolling out a plan to a small team.

{
  "plan_name": "from strategic_analysis.plan_name",
  "summary": "from strategic_analysis.summary (2-3 sentences max)",
  "confidence_level": "from strategic_analysis.confidence_level",
  "confidence_note": "from strategic_analysis.confidence_note (1-2 sentences)",
  "implementation": {
    "communication_plan": {
      "rep_faq": [
        {
          "question": "Anticipated rep question (plain language)",
          "answer": "Clear, honest answer with specific numbers from contract"
        }
      ]
    }
  },
  "slide_content": {
    "title_slide": {
      "title": "Company name + 'Sales Compensation Plan'",
      "subtitle": "Plan year"
    },
    "exec_summary_bullets": ["3-4 headline findings. 1 sentence each."],
    "role_summaries": [
      {
        "role": "Role name from contract",
        "ote": "OTE as string from contract",
        "pay_mix": "from contract pay_mix_display",
        "primary_measure": "First measure name from contract",
        "key_feature": "One standout design choice in 1 sentence"
      }
    ],
    "role_detail_slides": [
      {
        "role": "Role name. One entry per role in contract.",
        "bullets": ["4-6 bullets covering OTE, mix, measures, accelerators, ramp. Use EXACT numbers."],
        "speaker_notes": "2-3 talking points for presenting this role's plan"
      }
    ],
    "cost_model_bullets": ["3-4 bullets on investment at different attainment levels. Use EXACT cost numbers."],
    "appendix_attainment": [
      {
        "role": "Role name from contract",
        "earnings_80pct": "from contract formatted as '$X'",
        "earnings_100pct": "from contract formatted as '$X'",
        "earnings_120pct": "from contract formatted as '$X'",
        "earnings_150pct": "from contract formatted as '$X'"
      }
    ]
  }
}

RULES:
- rep_faq: include 4-5 entries. Questions reps actually ask, not HR boilerplate. Answers must use EXACT numbers.
- Include ONE entry in role_detail_slides and appendix_attainment for EACH role in the contract
- All slide bullets: 1 sentence max, standalone (someone reads them verbatim)
- Skip: transition_plan, rollout_phases, change_management_risks, team_announcement, manager_talking_points, philosophy_bullets, benchmarking_bullets, implementation_bullets, risk_bullets, next_steps_bullets, appendix_methodology, current_plan_bullets, segment_comparison

Respond with VALID JSON ONLY.`
}

// ===================================================================
// GROUP REGISTRY -- maps group IDs to their builders
// ===================================================================

export const GROUP_DEFINITIONS = {
  A: {
    name: 'Roles & Cost Model',
    description: 'Core plan structure with role details and cost modeling',
    outputKeys: ['roles', 'cost_model'],
    buildSystemPrompt: buildGroupASystemPrompt,
    buildUserPrompt: buildGroupAUserPrompt,
    maxTokens: 16384,
  },
  B: {
    name: 'Strategy & Benchmarking',
    description: 'Executive briefing, benchmarking, baseline comparison',
    outputKeys: ['executive_briefing', 'benchmarking', 'baseline_comparison'],
    buildSystemPrompt: buildGroupBSystemPrompt,
    buildUserPrompt: buildGroupBUserPrompt,
    maxTokens: 4096,
  },
  C: {
    name: 'Operations',
    description: 'Crediting, quota methodology, governance, cross-role alignment',
    outputKeys: ['crediting_rules', 'quota_methodology', 'governance', 'cross_role_alignment'],
    buildSystemPrompt: buildGroupCSystemPrompt,
    buildUserPrompt: buildGroupCUserPrompt,
    maxTokens: 4096,
  },
  D: {
    name: 'Diagnostics & Scenarios',
    description: 'Scenarios, warnings, assumptions',
    outputKeys: ['scenarios', 'global_warnings', 'assumptions'],
    buildSystemPrompt: buildGroupDSystemPrompt,
    buildUserPrompt: buildGroupDUserPrompt,
    maxTokens: 4096,
  },
  E: {
    name: 'Communication & Slides',
    description: 'Implementation FAQ, slide content, metadata',
    outputKeys: ['implementation', 'slide_content', 'plan_name', 'summary', 'confidence_level', 'confidence_note'],
    buildSystemPrompt: buildGroupESystemPrompt,
    buildUserPrompt: buildGroupEUserPrompt,
    maxTokens: 8192,
  },
}
