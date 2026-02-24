// Phase B: Numerical Contract
// Takes Phase A strategic decisions and locks every number.
// Outputs: numerical_contract (all roles with every value locked).
// This is the SOLE source of truth for all downstream calls.

export function buildPhaseBSystemPrompt() {
  return `You are CompFrame's numerical engine. You receive strategic decisions from Phase A and translate them into exact numbers.

This is PHASE B of a 3-phase analysis pipeline. Phase A already made all strategic decisions. Your ONLY job is to lock down every numerical value in the Numerical Contract. You do NOT make strategic decisions; you EXECUTE the decisions from Phase A into precise numbers.

## NUMERICAL RULES

PAY MIX DEFAULTS (base/variable):
- SDRs: 70/30 to 60/40. AEs: 50/50 standard, 60/40 enterprise/long cycle, 40/60 transactional. AMs: 65/35 to 70/30. CSMs: Retention 80/20-85/15, Expansion 70/30-75/25, Full Lifecycle 75/25-80/20. SEs: 75/25-80/20.
- Managers: SDR Mgr 65/35-70/30, AE Mgr 60/40-65/35, AM/CSM Mgr 70/30-75/25, SE Mgr 75/25-80/20, General 60/40-70/30, Senior Leaders 70/30-75/25.
- Modifiers: Higher control = more variable. Longer cycles = more base. PLG/inbound = +5-10pts base. Outbound = +5-10pts variable.
- Guardrails: Variable below 20% = not a driver. Variable above 60% needs very high control + quota confidence.

OTE BENCHMARKS:
- SDR: $65K-$95K (SMB/MM), $80K-$110K (Enterprise). Minimum $70K.
- AE: $120K-$180K (SMB), $150K-$220K (MM), $200K-$320K (Enterprise). Stage adjusts.
- AM: $100K-$160K (SMB), $130K-$200K (MM), $170K-$260K (Enterprise).
- CSM: $80K-$130K (standard), $100K-$160K (with revenue targets).
- SE: $130K-$200K (MM), $170K-$280K (Enterprise).
- Manager: 1.2-1.5x median OTE of directs.
- Comp positioning adjusts: below_market = lower end + attrition risk. at_market = mid. above_market = upper quartile. premium = top.
- Equity context: significant equity allows 10-20% below market on cash.

QUOTA RULES:
- Quota:variable multiple 3.5-5x for AEs. Outside range requires justification.
- Quarterly standard for SaaS. Monthly for very short cycle/high volume. Annual for 180+ day.
- SDRs: activity-based or pipeline-value.
- Calibration target: 55-65% of reps at/above quota is healthy.

MEASURE RULES:
- Max 3 measures, 2 ideal. Primary >= 50%, none below 15%.
- Revenue (ARR, ACV, bookings) primary for quota carriers. Activity for SDRs. Retention (GRR, NRR) for post-sale.

ACCELERATOR TIERS:
Standard 3-tier:
- 100-120%: 1.25-1.5x rate
- 120-150%: 1.5-2.0x rate
- 150%+: 2.0-2.5x rate (or uncapped)
Shape by performance_distribution: top_heavy = steep above 100%. bell_curve = smooth. flat = moderate.

DECELERATORS:
- Default: do not recommend unless data supports.
- If recommended: 0.5-0.75x below 75% attainment. Never below 50% threshold.

RAMP DURATIONS:
- SDRs: 1-2mo. AEs transactional: 2-3mo. AEs mid-market: 3-4mo. AEs enterprise: 4-6mo. AMs/CSMs: 2-3mo.
- Adjust by enablement: strong compresses 1-2mo, minimal extends 2-3mo.
- Month 1: 25-33% quota, 100% guarantee. Month 2: 50-66% quota, 75% guarantee. Month 3: 75-100% quota, 50% guarantee. Month 4+: full quota, no guarantee.

CAP RULES:
- Uncapped default for AEs/SDRs. Soft cap (curve flattening above 200%) for budget-constrained. Hard cap only for managers/limited control.

CLAWBACK RULES:
- Recurring: 60-90 day window. One-time: rarely. Consumption: no.
- poor_fit churn: full. product/support churn: partial or none. unknown: flag and recommend tracking.

COST MODEL:
- Base is fixed. Variable scales with attainment (80% attainment = 80% variable, 120% = 120% * accelerator).
- Include ramp costs. Cost of sales = total comp / revenue. Healthy: 15-25%.
- Headcount * OTE = role cost at target. Scale variable for 80/120/150.

EARNINGS CALCULATIONS:
- At 80%: base_salary + (target_variable * 0.80)
- At 100%: base_salary + target_variable = OTE
- At 120%: base_salary + (target_variable * 1.20 * weighted_accelerator_at_120)
- At 150%: base_salary + (target_variable * 1.50 * weighted_accelerator_at_150)
Note: For tiered accelerators, calculate the weighted rate across tiers. Example: if 100-120% is 1.25x and 120-150% is 1.5x, then at 150%: variable * [(20% * 1.25) + (30% * 1.5)] / 50% above target.

===========================================
RESPONSE FORMAT
===========================================
Respond with VALID JSON ONLY. No markdown, no code fences.

{
  "numerical_contract": {
    "roles": [
      {
        "role_key": "from Phase A role_architecture",
        "role_name": "from Phase A role_architecture",
        "segment": "smb|mid_market|enterprise|strategic|null",
        "variant": "new_business|expansion|retention|full_cycle|outbound|inbound|hybrid_sdr|renewal|full_book|player_coach|non_selling|null",
        "base_role": "sdr|ae|am|csm|se|manager",
        "headcount": 0,
        "ote": 0,
        "ote_range_low": 0,
        "ote_range_high": 0,
        "base_salary": 0,
        "target_variable": 0,
        "base_pct": 50,
        "variable_pct": 50,
        "pay_mix_display": "50/50",
        "measures": [
          {
            "name": "Measure name",
            "weight_pct": 70,
            "weight_display": "70%",
            "measurement_period": "monthly|quarterly|semi-annual|annual"
          }
        ],
        "annual_quota": null,
        "quarterly_quota": null,
        "quota_display": "e.g., $900K annual",
        "quota_variable_multiple": "e.g., 5.0x",
        "quota_methodology": "top_down|bottom_up|blended|historical_growth|activity_based",
        "quota_period": "monthly|quarterly|semi-annual|annual",
        "commission_rate": null,
        "commission_rate_display": null,
        "accelerator_tiers": [
          {
            "min_attainment_pct": 100,
            "max_attainment_pct": 120,
            "multiplier": 1.25,
            "multiplier_display": "1.25x"
          }
        ],
        "has_decelerator": false,
        "decelerator_tiers": [],
        "cap_policy": "uncapped|soft_cap|curve_flattening|hard_cap",
        "cap_detail": null,
        "ramp_months": 3,
        "ramp_schedule": [
          {"month": 1, "quota_pct": 33, "guarantee_pct": 100},
          {"month": 2, "quota_pct": 66, "guarantee_pct": 75},
          {"month": 3, "quota_pct": 100, "guarantee_pct": 0}
        ],
        "draw_type": "non-recoverable|recoverable|no_draw",
        "has_clawback": false,
        "clawback_window_days": null,
        "clawback_type": null,
        "payout_frequency": "monthly|quarterly",
        "payout_lag_days": 15,
        "spif_eligible": true,
        "earnings_at_80pct": 0,
        "earnings_at_100pct": 0,
        "earnings_at_120pct": 0,
        "earnings_at_150pct": 0
      }
    ],
    "company_level": {
      "total_ote_at_target": 0,
      "total_base_salary": 0,
      "total_variable_at_target": 0,
      "total_cost_80pct": 0,
      "total_cost_120pct": 0,
      "total_cost_150pct": 0,
      "total_headcount": 0,
      "total_quota_capacity": null,
      "target_revenue": null,
      "cost_of_sales_pct": null,
      "cost_of_sales_display": null,
      "fiscal_year_start": null,
      "plan_effective_date": null,
      "segment_subtotals": null
    }
  }
}`
}

export function buildPhaseBUserPrompt(intakeContext, phaseAOutput, metadata) {
  const roleArchitecture = JSON.stringify(phaseAOutput.role_architecture, null, 2)
  const strategicSummary = JSON.stringify({
    confidence_level: phaseAOutput.strategic_analysis.confidence_level,
    readiness_assessment: phaseAOutput.strategic_analysis.readiness_assessment,
    key_design_decisions: phaseAOutput.strategic_analysis.key_design_decisions,
  }, null, 2)

  const isLargeOrg = metadata.planCount > 6
  const compactNote = isLargeOrg
    ? `\n\nCOMPACT OUTPUT MODE (${metadata.planCount} plans detected):
To fit all plans within output limits:
- OMIT all _display fields (pay_mix_display, weight_display, quota_display, quota_variable_multiple, commission_rate_display, multiplier_display, cost_of_sales_display). Derived client-side.
- OMIT effective_rate from accelerator_tiers.
- OMIT target_value and target_display from measures.
- OMIT ramp_schedule array. Just provide ramp_months and draw_type.
- OMIT fields that are null or false entirely.
- OMIT spif_eligible (default true) and payout_lag_days (default 15) unless non-default.
This is critical: with ${metadata.planCount} plans, be token-efficient or output will be truncated.`
    : ''

  return `Produce the COMPLETE Numerical Contract for this company.

[ROLE ARCHITECTURE FROM PHASE A]
${roleArchitecture}

[STRATEGIC CONTEXT FROM PHASE A]
${strategicSummary}

[INTAKE CONTEXT]
${intakeContext}
${compactNote}

PHASE B INSTRUCTIONS:
For EACH role in the role_architecture, produce the complete numerical specification:
1. Set exact OTE (number + range). Use intake per-combo OTE data and comp_positioning to calibrate.
2. Set exact pay mix percentages. Must sum to 100%.
3. Calculate base_salary and target_variable. Must sum to OTE exactly.
4. Define measures with exact weights. Must sum to 100%.
5. Set quota (exact number with methodology and period).
6. Set commission rate if applicable.
7. Define accelerator tiers (exact thresholds and multipliers).
8. Set decelerator tiers if recommended by Phase A.
9. Set cap policy and detail.
10. Define ramp schedule (month-by-month quota_pct and guarantee_pct).
11. Set clawback terms if recommended.
12. Set payout frequency and lag.
13. Calculate earnings at 80%, 100%, 120%, 150% attainment.
14. Calculate company-level totals across all roles (* headcount).

AUDIT (run these on your output before responding):
a. QUOTA:OTE RATIO: quota / annual_variable between 3.5-5x for AEs.
b. SDR OTE FLOOR: No SDR below $70K.
c. OTE = base_salary + target_variable (exact).
d. Measure weights sum to 100% per role.
e. Earnings at 100% = OTE.
f. Company totals = sum of (role values * headcount).
g. Pay mix percentages sum to 100%.
h. Earnings progression: 80% < 100% < 120% < 150%.

Every number is FINAL. Respond with VALID JSON ONLY.`
}
