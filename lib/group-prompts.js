// Group Prompt Builders -- 5 parallel calls that format the analysis layer output
// into specific sections of the final recommendations JSON.
//
// CRITICAL: These groups do NOT make independent strategic decisions.
// They format and enrich the analysis layer's decisions into the final schema.
// All numbers come from the numerical_contract.

const NUMERICAL_CONSISTENCY_HEADER = `CRITICAL: NUMERICAL CONSISTENCY REQUIREMENT

The numerical_contract below is the SOLE source of truth for all figures.
You MUST:
1. Use ONLY values from the numerical_contract. Do not round, approximate, recalculate, or derive independently.
2. Use "_display" formatted versions in prose (e.g., "10%" not "0.10", "50/50" not "50%/50%").
3. Reference roles by their exact role_name from the contract.
4. If you need a number NOT in the contract, derive it explicitly from contract values and show the math.
5. When showing earnings examples, always anchor to contract values exactly.

`

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
  const contract = JSON.stringify(analysisOutput.numerical_contract, null, 2)
  const roleAnalysis = JSON.stringify(analysisOutput.role_analysis, null, 2)

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
        "rationale": "from role_analysis.ote_rationale"
      },
      "pay_mix": {
        "base_pct": "from contract.base_pct",
        "variable_pct": "from contract.variable_pct",
        "rationale": "from role_analysis.pay_mix_rationale"
      },
      "measures": [
        {
          "name": "from contract.measures[].name",
          "weight_pct": "from contract.measures[].weight_pct",
          "measurement_period": "from contract.measures[].measurement_period",
          "description": "Expand on what this measure is and why. Use role_analysis.measure_rationale as basis."
        }
      ],
      "quota": {
        "methodology": "from role_analysis.quota_rationale (expand into methodology description)",
        "multiple": "from contract.quota_variable_multiple (e.g., '5.2x variable comp ($520K quota vs $100K annual variable)')",
        "period": "from contract.quota_period",
        "rationale": "from role_analysis.quota_rationale"
      },
      "accelerators": {
        "structure": "Build full text description from contract.accelerator_tiers (e.g., '100-120%: 1.25x rate, 120-150%: 1.5x rate, 150%+: 2.0x rate')",
        "multiplier": "highest multiplier from contract.accelerator_tiers",
        "threshold_pct": 100,
        "rationale": "from role_analysis.accelerator_rationale",
        "behavioral_note": "Optional behavioral impact note"
      },
      "decelerators": {
        "recommended": "from contract.has_decelerator",
        "structure": "from role_analysis.decelerator_structure_description or null",
        "rationale": "from role_analysis.decelerator_rationale"
      },
      "ramp": {
        "duration_months": "from contract.ramp_months",
        "structure": "Build text from contract.ramp_schedule (e.g., 'Month 1: 33% quota with full guarantee...')",
        "draw_type": "from contract.draw_type",
        "rationale": "from role_analysis.ramp_rationale"
      },
      "cap_policy": {
        "type": "from contract.cap_policy",
        "detail": "from contract.cap_detail",
        "rationale": "from role_analysis.cap_rationale"
      },
      "clawback": {
        "recommended": "from contract.has_clawback",
        "structure": "from role_analysis.clawback_structure_description or null",
        "rationale": "from role_analysis.clawback_rationale"
      },
      "payout_frequency": "from contract.payout_frequency",
      "behavioral_note": "from role_analysis.behavioral_note",
      "warnings": "from role_analysis.warnings"
    }
  },
  "cost_model": {
    "total_ote_at_target": "from contract.company_level.total_ote_at_target (NUMBER)",
    "total_cost_80pct": "from contract.company_level.total_cost_80pct (NUMBER)",
    "total_cost_120pct": "from contract.company_level.total_cost_120pct (NUMBER)",
    "total_cost_150pct": "from contract.company_level.total_cost_150pct (NUMBER)",
    "base_salary_total": "from contract.company_level.total_base_salary (NUMBER)",
    "variable_at_target_total": "from contract.company_level.total_variable_at_target (NUMBER)",
    "cost_of_sales_pct": "from contract.company_level.cost_of_sales_display or calculate",
    "headcount_summary": "Build from contract roles (e.g., '3 AEs + 2 SDRs + 1 AM = 6 comp plans')",
    "segment_subtotals": "from contract.company_level.segment_subtotals or null",
    "budget_notes": "Compare against budget if intake has budget_constraint. null if no budget data."
  }
}

ALL cost_model number fields MUST be numbers, not strings.
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
  const contract = JSON.stringify(analysisOutput.numerical_contract, null, 2)
  const strategic = JSON.stringify(analysisOutput.strategic_analysis, null, 2)

  return `${NUMERICAL_CONSISTENCY_HEADER}

[NUMERICAL CONTRACT]
${contract}

[STRATEGIC ANALYSIS]
${strategic}

[INTAKE CONTEXT]
${intakeContext}

FORMAT INSTRUCTIONS:
Generate "executive_briefing", "benchmarking", and "baseline_comparison" objects.

{
  "executive_briefing": {
    "comp_philosophy": "Expand strategic_analysis.comp_philosophy into 2-3 substantive paragraphs a VP Sales would present to their board. Include the priority_alignment content. Reference specific numbers from the contract.",
    "key_design_decisions": "from strategic_analysis.key_design_decisions (enrich with more detail)",
    "methodology_notes": "Brief description of data sources and framework. Include: 'Recommendations generated using CompFrame's 21-module compensation rules engine, calibrated against current industry benchmarks from Bridge Group, ICONIQ Growth, CaptivateIQ, and RepVue.'"
  },
  "benchmarking": {
    "market_positioning": "Overall market positioning narrative. Reference contract OTE values and comp_positioning from intake.",
    "role_benchmarks": [
      {
        "role": "Role name from contract",
        "ote_vs_market": "e.g., 'At market (50th-60th percentile)'",
        "pay_mix_vs_market": "How mix compares to typical",
        "notable_deviations": "Deliberate deviations with explanation"
      }
    ],
    "data_sources": "Benchmark data sourced from Bridge Group 2024 SaaS AE/SDR reports, ICONIQ Growth operating benchmarks, CaptivateIQ compensation trends, and RepVue comp data aggregation."
  },
  "baseline_comparison": {
    "has_baseline": "from strategic_analysis.current_plan_diagnosis.has_baseline",
    "current_plan_assessment": "Expand current_plan_diagnosis into prose. null if no baseline.",
    "change_summary": "from strategic_analysis.current_plan_diagnosis.change_summary. Enrich each entry with transition_note.",
    "estimated_impact": "Narrative summary of expected impact. null if no baseline."
  }
}

Write at consulting-grade quality. The executive_briefing.comp_philosophy should read like it was written by a $500/hour compensation consultant.
Respond with VALID JSON ONLY.`
}

// ===================================================================
// GROUP C: Operations
// Crediting, quota methodology, governance, payout, cross-role, SPIFs
// ===================================================================

export function buildGroupCSystemPrompt() {
  return buildGroupSystemPrompt('C', '"crediting_rules", "quota_methodology", "governance", "payout_mechanics", "cross_role_alignment", and "spif_suggestions"')
}

export function buildGroupCUserPrompt(intakeContext, analysisOutput) {
  const contract = JSON.stringify(analysisOutput.numerical_contract, null, 2)
  const operational = JSON.stringify(analysisOutput.operational_analysis, null, 2)

  return `${NUMERICAL_CONSISTENCY_HEADER}

[NUMERICAL CONTRACT]
${contract}

[OPERATIONAL ANALYSIS]
${operational}

[INTAKE CONTEXT]
${intakeContext}

FORMAT INSTRUCTIONS:
Generate the six operational objects below. Expand the operational_analysis content into full, detailed prose suitable for a consulting deliverable.

{
  "crediting_rules": {
    "model": "from operational_analysis.crediting_rules.model",
    "rules": "from operational_analysis.crediting_rules.rules (expand each scenario with more detail)",
    "total_credit_cap": "from operational_analysis.crediting_rules.total_credit_cap",
    "handoff_rules": "from operational_analysis.crediting_rules.handoff_rules (expand)",
    "dispute_process": "from operational_analysis.crediting_rules.dispute_process (expand)"
  },
  "quota_methodology": {
    "recommended_approach": "from operational_analysis.quota_methodology.recommended_approach (expand)",
    "setting_process": "from operational_analysis.quota_methodology.setting_process (expand into detailed step-by-step)",
    "calibration_target": "from operational_analysis.quota_methodology.calibration_target",
    "adjustment_triggers": "from operational_analysis.quota_methodology.adjustment_triggers (expand)",
    "communication_guidance": "from operational_analysis.quota_methodology.communication_guidance (expand)"
  },
  "governance": {
    "review_cadence": "from operational_analysis.governance.review_cadence (expand)",
    "kpis": "from operational_analysis.governance.kpis",
    "exception_process": "from operational_analysis.governance.exception_process (expand into detailed policy)",
    "amendment_process": "from operational_analysis.governance.amendment_process (expand)",
    "admin_recommendations": "from operational_analysis.governance.admin_recommendations (expand)"
  },
  "payout_mechanics": {
    "frequency": "from operational_analysis.payout_mechanics.frequency",
    "calculation_method": "from operational_analysis.payout_mechanics.calculation_method (expand)",
    "payment_timing": "from operational_analysis.payout_mechanics.payment_timing",
    "dispute_resolution": "from operational_analysis.payout_mechanics.dispute_resolution (expand)"
  },
  "cross_role_alignment": {
    "pipeline_flow": "from operational_analysis.cross_role_alignment.pipeline_flow (expand with specific numbers from contract)",
    "crediting_notes": "from operational_analysis.cross_role_alignment.crediting_notes (expand)",
    "cost_ratio": "from operational_analysis.cross_role_alignment.cost_ratio (calculate using contract numbers)",
    "segment_alignment": "from operational_analysis.cross_role_alignment.segment_alignment or null",
    "alignment_warnings": "from operational_analysis.cross_role_alignment.alignment_warnings"
  },
  "spif_suggestions": "from operational_analysis.spif_suggestions (expand each with implementation detail)"
}

Reference exact numbers from the numerical_contract when discussing quotas, OTEs, or rates.
Respond with VALID JSON ONLY.`
}

// ===================================================================
// GROUP D: Diagnostics & Scenarios
// Anti-patterns, scenarios, warnings, assumptions
// ===================================================================

export function buildGroupDSystemPrompt() {
  return buildGroupSystemPrompt('D', '"anti_patterns_detected", "scenarios", "global_warnings", and "assumptions"')
}

export function buildGroupDUserPrompt(intakeContext, analysisOutput) {
  const contract = JSON.stringify(analysisOutput.numerical_contract, null, 2)
  const strategic = JSON.stringify(analysisOutput.strategic_analysis, null, 2)
  const scenarios = JSON.stringify(analysisOutput.scenarios, null, 2)

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
Generate diagnostic outputs. Expand the analysis layer's findings into detailed, actionable content.

{
  "anti_patterns_detected": "from strategic_analysis.anti_patterns_detected. Expand each with specific explanation of what the pattern is, why it's dangerous, and what the plan does to address it.",
  "scenarios": [
    {
      "id": "from analysis scenarios[].id",
      "label": "from analysis scenarios[].label",
      "trigger": "from analysis scenarios[].trigger (expand with specific conditions)",
      "severity": "from analysis scenarios[].severity",
      "summary": "from analysis scenarios[].summary",
      "role_impacts": {
        "role_key": {
          "role_name": "from contract role_name",
          "ote": "adjusted OTE number or null if unchanged",
          "base_pct": "adjusted base % or null",
          "measure_weights": [{"name": "measure", "weight_pct": 0}],
          "accel_note": "description of accelerator changes or null"
        }
      }
    }
  ],
  "global_warnings": "from analysis global_warnings. Expand each into 1-2 detailed sentences with specific recommendations.",
  "assumptions": "from analysis assumptions. Expand each into a clear, testable assumption statement."
}

SCENARIO REQUIREMENTS:
- Include 3-5 scenarios
- Each MUST have concrete numeric adjustments in role_impacts using EXACT numbers from the contract as baseline
- Severity: "high" if fundamentally alters plan, "medium" for significant but contained, "low" for minor
- Every scenario must impact at least one role with at least one numeric adjustment

Respond with VALID JSON ONLY.`
}

// ===================================================================
// GROUP E: Communication, Transition & Slides
// Implementation, transition plan, slide content, and top-level metadata
// ===================================================================

export function buildGroupESystemPrompt() {
  return buildGroupSystemPrompt('E', '"implementation", "transition_plan", "slide_content", "plan_name", "summary", "confidence_level", and "confidence_note"')
}

export function buildGroupEUserPrompt(intakeContext, analysisOutput) {
  const contract = JSON.stringify(analysisOutput.numerical_contract, null, 2)
  const strategic = JSON.stringify(analysisOutput.strategic_analysis, null, 2)
  const operational = JSON.stringify(analysisOutput.operational_analysis, null, 2)

  return `${NUMERICAL_CONSISTENCY_HEADER}

[NUMERICAL CONTRACT]
${contract}

[STRATEGIC ANALYSIS]
${strategic}

[OPERATIONAL ANALYSIS]
${operational}

[INTAKE CONTEXT]
${intakeContext}

FORMAT INSTRUCTIONS:
Generate communication, transition, and presentation content.

{
  "plan_name": "from strategic_analysis.plan_name",
  "summary": "from strategic_analysis.summary",
  "confidence_level": "from strategic_analysis.confidence_level",
  "confidence_note": "from strategic_analysis.confidence_note",
  "implementation": {
    "rollout_phases": "from operational_analysis.implementation.rollout_phases (expand activities into detailed action items)",
    "communication_plan": {
      "team_announcement": "Write 2-3 paragraph draft announcement for all-hands. Professional, motivating tone. Reference specific plan highlights from the contract (OTE numbers, accelerator potential).",
      "manager_talking_points": ["7 detailed talking points for managers to cover in 1:1s. Include specific numbers."],
      "rep_faq": [
        {
          "question": "Anticipated rep question",
          "answer": "Clear, honest answer with specific numbers from contract"
        }
      ]
    },
    "change_management_risks": "from operational_analysis.implementation.change_management_risks (expand mitigations)",
    "measurement_governance": {
      "reporting_cadence": "Detailed reporting schedule",
      "kpis_to_track": ["5-7 KPIs with target ranges"],
      "trigger_events": ["Events triggering mid-cycle review"],
      "admin_recommendations": "Detailed admin tool and process recommendations"
    }
  },
  "transition_plan": {
    "timeline": "from operational_analysis.transition_plan.timeline (expand into detailed timeline)",
    "risk_level": "from operational_analysis.transition_plan.risk_level",
    "parallel_calculation": "from operational_analysis.transition_plan.parallel_calculation",
    "grandfathering": "from operational_analysis.transition_plan.grandfathering",
    "communication_sequence": "from operational_analysis.transition_plan.communication_sequence (expand each with detailed key_messages)"
  },
  "slide_content": {
    "title_slide": {
      "title": "Company name + 'Sales Compensation Plan'",
      "subtitle": "Plan year and version"
    },
    "exec_summary_bullets": ["3-4 headline findings. Each is a complete thought. 1-2 sentences max. Reference specific numbers."],
    "philosophy_bullets": ["3-4 bullets distilling comp philosophy for a slide"],
    "current_plan_bullets": ["2-4 bullets on current plan issues. ONLY if baseline data exists, otherwise empty array."],
    "role_summaries": [
      {
        "role": "Role name from contract",
        "ote": "OTE as string from contract (e.g., '$180,000')",
        "pay_mix": "from contract pay_mix_display",
        "primary_measure": "First measure name from contract",
        "key_feature": "One standout design choice"
      }
    ],
    "segment_comparison": "For multi-segment: comparison array. null for single-segment.",
    "role_detail_slides": [
      {
        "role": "Role name. One entry per role in contract.",
        "bullets": ["4-6 bullets covering OTE, mix, measures, accelerators, ramp, key rationale. Use EXACT numbers from contract."],
        "speaker_notes": "Talking points including anticipated questions"
      }
    ],
    "cost_model_bullets": ["3-4 bullets on investment at different attainment levels. Use EXACT cost numbers from contract."],
    "benchmarking_bullets": ["3-4 bullets on market positioning"],
    "key_decisions_bullets": ["3-5 bullets, each covering one design decision"],
    "implementation_bullets": ["3-4 bullets on rollout phases"],
    "risk_bullets": ["3-4 risks with mitigations"],
    "next_steps_bullets": ["3-5 action items"],
    "appendix_attainment": [
      {
        "role": "Role name from contract",
        "earnings_80pct": "from contract.earnings_at_80pct formatted as '$X'",
        "earnings_100pct": "from contract.earnings_at_100pct formatted as '$X'",
        "earnings_120pct": "from contract.earnings_at_120pct formatted as '$X'",
        "earnings_150pct": "from contract.earnings_at_150pct formatted as '$X'"
      }
    ],
    "appendix_methodology": ["3-4 bullets on data sources, assumptions, framework"]
  }
}

SLIDE CONTENT RULES:
- Each bullet must be a COMPLETE thought that stands on its own in a presentation
- Write as if the VP Sales will read these verbatim
- Keep bullets to 1-2 sentences max
- Include ONE entry in role_detail_slides for EACH role in the contract
- Include appendix_attainment for EACH role using EXACT earnings numbers from contract
- The rep_faq should include 5-7 entries with honest, specific answers
- Include current_plan_bullets ONLY if strategic_analysis.current_plan_diagnosis.has_baseline is true

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
    description: 'Executive briefing, market positioning, baseline comparison',
    outputKeys: ['executive_briefing', 'benchmarking', 'baseline_comparison'],
    buildSystemPrompt: buildGroupBSystemPrompt,
    buildUserPrompt: buildGroupBUserPrompt,
    maxTokens: 8192,
  },
  C: {
    name: 'Operations',
    description: 'Crediting, quota, governance, payout, cross-role alignment',
    outputKeys: ['crediting_rules', 'quota_methodology', 'governance', 'payout_mechanics', 'cross_role_alignment', 'spif_suggestions'],
    buildSystemPrompt: buildGroupCSystemPrompt,
    buildUserPrompt: buildGroupCUserPrompt,
    maxTokens: 8192,
  },
  D: {
    name: 'Diagnostics & Scenarios',
    description: 'Anti-patterns, scenarios, warnings, assumptions',
    outputKeys: ['anti_patterns_detected', 'scenarios', 'global_warnings', 'assumptions'],
    buildSystemPrompt: buildGroupDSystemPrompt,
    buildUserPrompt: buildGroupDUserPrompt,
    maxTokens: 8192,
  },
  E: {
    name: 'Communication & Slides',
    description: 'Implementation, transition, slide content, metadata',
    outputKeys: ['implementation', 'transition_plan', 'slide_content', 'plan_name', 'summary', 'confidence_level', 'confidence_note'],
    buildSystemPrompt: buildGroupESystemPrompt,
    buildUserPrompt: buildGroupEUserPrompt,
    maxTokens: 16384,
  },
}
