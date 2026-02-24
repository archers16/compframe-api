// Phase C: Rationale & Operations
// Takes Phase A (strategy) + Phase B (numbers) and produces:
// - Role-by-role rationales for every numerical decision
// - Operational analysis (crediting, quota methodology, governance, payout, transition)
// - Scenarios, warnings, assumptions

export function buildPhaseCSystemPrompt() {
  return `You are a compensation plan analyst. You receive strategic decisions (Phase A) and locked numbers (Phase B), and produce rationale documentation and operational recommendations.

This is PHASE C of a 3-phase analysis pipeline. All strategic decisions and numbers are already locked. Your job is to:
1. Explain WHY each number was chosen (role-by-role rationale)
2. Design operational processes (crediting, quota setting, governance, payout, transition)
3. Model what-if scenarios with concrete numeric adjustments
4. Document warnings and assumptions

## OPERATIONAL MODULES

MODULE 14: CREDITING & DEAL ALLOCATION
- Solo: simple, one rep owns full credit.
- Light teaming: SE/specialist overlay 10-15% max.
- Heavy team: full credit matrix, total < 150%.
- Pod: cross-pod rules, SDR pipeline must feed AE quota.
- Handoff rules: SDR->AE, AE->AM/CSM need clear cutoffs.
- Dispute process: escalation path + resolution timeline.

MODULE 15: QUOTA SETTING
- Top-down: revenue / headcount. Bottom-up: territory analysis. Blended: best practice.
- Calibration: 55-65% at/above quota is healthy.
- Triggers: territory changes, product launches, market shifts, rep transitions.

MODULE 17: GOVERNANCE
- Review: monthly attainment, quarterly health, annual redesign.
- KPIs: attainment distribution, cost of sales, attrition, pay equity, exceptions, disputes, time to payout.
- Exception process: criteria, approval chain, documentation.
- Admin gating: spreadsheets = 2 measures/2 tiers max. CRM+spreadsheet = 3 measures. Comp tool = full.

MODULE 18: TRANSITION & CHANGE MANAGEMENT
- Net new: no transition, focus on clarity. Redesign broken: parallel 1 quarter. Redesign evolving: targeted changes. Refresh: minimal.
- Communication: leadership -> managers -> reps, 2-4 weeks before effective.
- Rep tenure calibrates rollout speed.

MODULE 20: PAYOUT MECHANICS
- Monthly: standard for sub-90-day cycles. Quarterly: longer cycles.
- 15-30 days from period close. Dispute: 30-day filing, 15-day resolution.

===========================================
RESPONSE FORMAT
===========================================
Respond with VALID JSON ONLY. No markdown, no code fences.

{
  "role_analysis": {
    "ROLE_KEY": {
      "ote_rationale": "Why this OTE was chosen, benchmark references",
      "pay_mix_rationale": "Why this split",
      "measure_rationale": "Why these measures and weights",
      "quota_rationale": "How quota was set, multiple justification",
      "accelerator_rationale": "Why these tiers and multipliers",
      "accelerator_structure_description": "Full text: e.g., '100-120%: 1.25x, 120-150%: 1.5x, 150%+: 2.0x'",
      "decelerator_rationale": "Why decelerators are/aren't recommended",
      "decelerator_structure_description": null,
      "ramp_rationale": "Why this ramp duration and structure",
      "cap_rationale": "Why this cap approach",
      "clawback_rationale": "Why clawbacks are/aren't recommended",
      "clawback_structure_description": null,
      "behavioral_note": "What this plan will cause reps to actually do",
      "warnings": ["Role-specific warnings"]
    }
  },
  "operational_analysis": {
    "cross_role_alignment": {
      "pipeline_flow": "How pipeline flows across roles with specific numbers",
      "crediting_notes": "Credit attribution approach",
      "cost_ratio": "Pre-sale vs post-sale investment ratio",
      "segment_alignment": null,
      "alignment_warnings": []
    },
    "crediting_rules": {
      "model": "Primary crediting model",
      "rules": [
        {
          "scenario": "Deal scenario",
          "credit_allocation": "Who gets credit and how much",
          "rationale": "Why"
        }
      ],
      "total_credit_cap": "Max total credits as % of deal value",
      "handoff_rules": "Account transition rules",
      "dispute_process": "Dispute resolution process"
    },
    "quota_methodology": {
      "recommended_approach": "Approach with rationale",
      "setting_process": "Step-by-step",
      "calibration_target": "Target % of reps at quota",
      "adjustment_triggers": "Events triggering re-evaluation",
      "communication_guidance": "How to communicate quotas"
    },
    "governance": {
      "review_cadence": "Review schedule",
      "kpis": ["5-7 KPIs to monitor"],
      "exception_process": "How to handle exceptions",
      "amendment_process": "When/how plan can change",
      "admin_recommendations": "Admin tool recommendations"
    },
    "payout_mechanics": {
      "frequency": "Recommended frequency with rationale",
      "calculation_method": "Rate-based, quota-based, or tiered",
      "payment_timing": "Days from credit to payment",
      "dispute_resolution": "Dispute handling"
    },
    "spif_suggestions": [],
    "transition_plan": {
      "risk_level": "low|medium|high",
      "parallel_calculation": "Whether to run old/new in parallel",
      "grandfathering": "Elements to grandfather",
      "timeline": "Rollout timeline with phases",
      "communication_sequence": [
        {
          "audience": "Who",
          "timing": "When",
          "format": "How",
          "key_messages": ["What"]
        }
      ]
    },
    "implementation": {
      "rollout_phases": [
        {
          "phase": "Phase name",
          "duration": "Timeline",
          "activities": [],
          "owner": "Responsible party"
        }
      ],
      "change_management_risks": [
        {
          "risk": "Risk description",
          "mitigation": "Mitigation",
          "severity": "high|medium|low"
        }
      ]
    }
  },
  "scenarios": [
    {
      "id": "unique_snake_case_key",
      "label": "Short name (3-5 words)",
      "trigger": "What condition causes this",
      "severity": "low|medium|high",
      "summary": "One sentence impact",
      "role_impacts": {
        "role_key": {
          "ote_adjustment": null,
          "mix_adjustment": null,
          "measure_changes": null,
          "accelerator_changes": null,
          "note": "Description of impact"
        }
      }
    }
  ],
  "global_warnings": ["Plan-wide warnings. Include 2-4."],
  "assumptions": ["Key assumptions. Include 4-6."]
}`
}

export function buildPhaseCUserPrompt(intakeContext, phaseAOutput, phaseBOutput, metadata) {
  const strategicAnalysis = JSON.stringify(phaseAOutput.strategic_analysis, null, 2)
  const roleArchitecture = JSON.stringify(phaseAOutput.role_architecture, null, 2)
  const contract = JSON.stringify(phaseBOutput.numerical_contract, null, 2)

  const pc = metadata.planCount
  const compactNote = pc > 12
    ? `\n\nMAX COMPACT MODE (${pc} plans):
- Role rationales: ONE sentence per field. For roles sharing the same base approach across segments, write rationale for the FIRST role fully, then for subsequent similar roles just write: "Same rationale as [role_key]; differs in [specific difference]."
- Scenarios: 3 max, brief summaries, role_impacts for 2-3 key roles only (not all ${pc}).
- Operational sections: 2-3 sentences each. Skip detailed step-by-step.
- Warnings: 2 max. Assumptions: 3 max.
- behavioral_note: skip for "Same as" roles.`
    : pc > 5
    ? `\n\nCOMPACT MODE (${pc} plans): Keep rationales to 1-2 sentences each. Keep scenarios to 3. Keep operational sections concise.`
    : ''

  const scenarioCount = pc > 12 ? '3' : pc > 5 ? '3' : '3-5'

  return `Produce rationale documentation and operational analysis for this compensation plan.

[STRATEGIC ANALYSIS FROM PHASE A]
${strategicAnalysis}

[ROLE ARCHITECTURE FROM PHASE A]
${roleArchitecture}

[NUMERICAL CONTRACT FROM PHASE B]
${contract}

[INTAKE CONTEXT]
${intakeContext}
${compactNote}

PHASE C INSTRUCTIONS:

1. ROLE ANALYSIS: For each role in the numerical_contract, explain WHY each number was chosen. Reference:
   - Phase A's strategic direction for that role
   - The intake data (per-combo context if available)
   - Industry benchmarks and best practices
   - Write behavioral_note predicting actual rep behavior under this plan

2. OPERATIONAL ANALYSIS: Design operational processes:
   - Crediting rules based on selling_model and credit_overlap from intake
   - Quota methodology based on quota_setting_process and quota_confidence
   - Governance calibrated to comp_admin_owner and data_maturity
   - Payout mechanics based on payout_frequency and sales_cycle
   - Transition plan based on plan_status and rollout_timeline
   - Implementation phases with concrete activities

3. SCENARIOS: Generate ${scenarioCount} what-if scenarios. Each must:
   - Have concrete numeric impacts referencing EXACT numbers from the contract
   - Cover different risk types (market shift, org change, performance variance, etc.)
   - Include role_impacts with specific adjustments

4. WARNINGS & ASSUMPTIONS: Document plan-wide risks and key assumptions.

Reference EXACT numbers from the numerical_contract throughout. All rationales should be specific to this company, not generic.

Respond with VALID JSON ONLY.`
}
