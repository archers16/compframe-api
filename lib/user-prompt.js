// User prompt builder -- extracted from generate.js for shared use across pipeline stages
// This builds the intake context block that all pipeline calls receive

export function buildUserPrompt(intake) {
  const labels = {
    // Phase 1: Company Profile
    company_stage: {
      seed: 'Seed / Pre-Series A', series_a: 'Series A', series_b: 'Series B',
      growth: 'Growth Stage (Series C+)', pre_ipo: 'Pre-IPO / Late Stage', public: 'Public Company'
    },
    team_size: {
      '1-5': '1-5 reps', '6-15': '6-15 reps', '16-30': '16-30 reps',
      '31-75': '31-75 reps', '76-200': '76-200 reps', '200+': '200+ reps'
    },
    role_types: {
      sdr: 'SDR / BDR', ae: 'Account Executive', am: 'Account Manager',
      csm: 'Customer Success Manager', se: 'Sales Engineer / SC', manager: 'Sales Manager'
    },
    sales_motion: {
      outbound: 'Outbound-led', inbound: 'Inbound-led', product_led: 'Product-led',
      channel: 'Channel / Partner', hybrid: 'Hybrid (inbound + outbound)'
    },
    deal_size: {
      under_5k: 'Under $5K ACV', '5k_25k': '$5K-$25K ACV', '25k_100k': '$25K-$100K ACV',
      '100k_500k': '$100K-$500K ACV', over_500k: '$500K+ ACV'
    },
    sales_cycle: {
      under_30: 'Under 30 days', '30_90': '30-90 days', '90_180': '90-180 days', over_180: '180+ days'
    },
    hiring_plan: {
      '0': 'No new hires (stable team)', '1-5': '1-5 new hires',
      '6-15': '6-15 new hires', '16-30': '16-30 new hires', '30+': '30+ new hires'
    },
    // New Phase 1 fields
    deal_structure: {
      recurring: 'Recurring (SaaS / subscription)',
      one_time: 'One-time (license / services / hardware)',
      consumption: 'Consumption / usage-based',
      mixed: 'Mixed (recurring + one-time)',
    },
    revenue_mix: {
      all_new: '80%+ new logos -- hunting-dominant',
      mostly_new: '60-80% new business, remainder expansion/renewal',
      balanced: 'Roughly balanced between new and expansion/renewal',
      mostly_expand: '60-80% expansion/renewal -- existing customer growth dominant',
      all_expand: '80%+ expansion/renewal -- farming-dominant',
    },
    plan_status: {
      net_new: 'First comp plan -- no formal plan exists',
      redesign_broken: 'Replacing existing plan -- current plan has problems',
      redesign_evolving: 'Replacing existing plan -- business has changed',
      refresh: 'Annual refresh / tuning of existing plan',
    },
    current_ote_range: {
      under_75k: 'Under $75K OTE',
      '75k_100k': '$75K-$100K OTE',
      '100k_150k': '$100K-$150K OTE',
      '150k_200k': '$150K-$200K OTE',
      '200k_300k': '$200K-$300K OTE',
      over_300k: '$300K+ OTE',
    },
    current_pay_mix: {
      heavy_base: 'Heavy base (70/30 or higher base)',
      balanced: 'Balanced (55-65% base / 35-45% variable)',
      variable_heavy: 'Variable-heavy (50/50 or more variable)',
      varies: 'Varies significantly by role',
      unsure: 'Unknown / not sure',
    },
    plan_pain_points: {
      top_performers_leaving: 'Top performers leaving for better comp',
      gaming: 'Reps gaming the system (sandbagging, deal timing, split abuse)',
      unclear_earnings: 'Reps can\'t understand or predict their earnings',
      wrong_behaviors: 'Plan rewards wrong behaviors',
      too_complex: 'Too complex to administer / frequent disputes',
      market_misalignment: 'OTE or pay mix out of step with market',
      sandbagging: 'Sandbagging / low effort once threshold is hit',
      misaligned_goals: 'Plan misaligned with company goals',
      territory_inequity: 'Uneven territories creating unfair advantages',
    },
    industry_vertical: {
      saas_software: 'SaaS / Software',
      fintech: 'Fintech / Financial Services',
      healthcare: 'Healthcare / Life Sciences',
      manufacturing: 'Manufacturing / Industrial',
      professional_services: 'Professional Services',
      media_advertising: 'Media / Advertising',
      other: 'Other industry'
    },
    // Phase 2: Sales Operations
    territory_model: {
      named: 'Named accounts -- reps own a specific account list',
      geographic: 'Geographic territories',
      vertical: 'Industry / vertical specialization',
      greenfield: 'Greenfield / open market -- first-touch ownership',
      round_robin: 'Round robin / pooled leads',
      hybrid_territory: 'Hybrid territory model',
    },
    selling_model: {
      solo: 'Solo rep -- one rep owns full cycle',
      team_light: 'Light teaming -- rep leads with occasional support',
      team_heavy: 'Heavy team selling -- multiple roles on most deals',
      pod: 'Pod structure -- dedicated SDR + AE + SE teams',
    },
    product_complexity: {
      single: 'Single product',
      few: '2-3 products, reps sell all',
      multi_equal: '4+ products, equal priority',
      multi_strategic: '4+ products with strategic priorities (steering needed)',
    },
    quota_confidence: {
      '1': '1/5 -- No historical data, targets are top-down guesses',
      '2': '2/5 -- Loosely informed by past performance but not rigorous',
      '3': '3/5 -- Reasonably confident with some data backing',
      '4': '4/5 -- Data-driven with territory-level analysis',
      '5': '5/5 -- High confidence with proven methodology and historical validation'
    },
    rep_control: {
      high: 'High -- reps control pricing, have balanced territories, and sell a mature product',
      medium: 'Medium -- some constraints exist but reps can meaningfully influence outcomes',
      low: 'Low -- pricing is dictated, territories are uneven, product has gaps that affect close rates'
    },
    enablement_maturity: {
      strong: 'Strong -- documented ICP, clear messaging, clean pricing, solid tooling, structured onboarding',
      developing: 'Developing -- some documentation exists, onboarding is informal but functional',
      early: 'Early -- tribal knowledge, reps figure it out, limited formal enablement',
      none: 'Minimal / None -- no formal enablement, reps are on their own'
    },
    churn_drivers: {
      poor_fit: 'Poor deal fit (reps sold to wrong-fit customers)',
      onboarding: 'Onboarding failure (customer never got to value)',
      product_gaps: 'Product gaps (product didn\'t meet expectations)',
      support: 'Support issues (poor post-sale experience)',
      budget: 'Customer budget cuts (external factor)',
      competition: 'Competitive displacement',
      unknown: 'Churn reasons not yet tracked'
    },
    historical_attainment: {
      under_30: 'Under 30% of reps hit quota -- most reps miss, quotas may be disconnected from reality',
      '30_50': '30-50% of reps hit quota -- below industry norms',
      '50_70': '50-70% of reps hit quota -- healthy range for most SaaS',
      '70_90': '70-90% of reps hit quota -- strong attainment, quotas may be conservative',
      over_90: '90%+ of reps hit quota -- nearly everyone hits, quotas may be too easy',
      first_year: 'No historical attainment data -- first year with quotas'
    },
    credit_overlap: {
      no_rules: 'No formal rules -- decided ad hoc',
      clear_primary: 'Clear primary rep ownership -- one person gets credit per deal',
      split_credit: 'Split credit -- deals divided by contribution',
      double_credit: 'Double credit -- multiple roles get full credit on same deal',
      overlay: 'Overlay model -- specialists get partial credit alongside primary rep'
    },
    sdr_ae_model: {
      dedicated: 'Dedicated SDRs per AE -- each AE has assigned SDR(s)',
      pooled: 'Pooled SDR team -- SDRs serve all AEs',
      hybrid_sdr_ae: 'Hybrid -- some dedicated, some pooled',
      no_sdr: 'No SDR function -- AEs source their own pipeline'
    },
    manager_roles: {
      non_selling: 'Non-selling managers -- manage only, no personal quota',
      player_coach: 'Player-coach -- carry personal quota alongside managing team',
      overlay_manager: 'Overlay -- managers support deals but don\'t own quota directly'
    },
    // New: Manager structure
    manager_functions: {
      sdr: 'Dedicated SDR/BDR Manager', ae: 'Dedicated AE/Closing Manager', am: 'Dedicated AM Manager',
      csm: 'Dedicated CSM Manager', se: 'Dedicated SE Manager', general: 'Cross-Function Sales Manager'
    },
    manager_levels: {
      frontline_only: 'Frontline managers only -- one level of management',
      multiple_levels: 'Multiple levels -- frontline managers + Directors/RVPs/VPs above them'
    },
    manager_selling: {
      player_coach: 'Player-coach -- carries personal quota alongside team targets',
      team_only: 'Team targets only -- measured purely on team performance',
      hybrid_manager: 'Hybrid -- small personal book plus team targets',
      varies: 'Varies by function -- different models for different teams'
    },
    // New: CSM variants
    has_csm_variants: {
      single: 'All CSMs share the same comp plan',
      variants: 'Specialized CSM variants with different comp structures'
    },
    csm_variant_types: {
      retention: 'Retention-Focused CSM -- primary goal is preventing churn and maintaining GRR',
      expansion: 'Expansion-Focused CSM -- primary goal is upsell, cross-sell, and account growth',
      full_lifecycle: 'Full Lifecycle CSM -- owns both retention and expansion'
    },
    // New: Post-sale ownership
    post_sale_ownership: {
      am_retention_csm_expansion: 'AM owns retention, CSM drives expansion',
      am_expansion_csm_retention: 'AM drives expansion, CSM owns retention',
      am_owns_both: 'AM owns both retention + expansion, CSM is non-revenue support role',
      csm_owns_both: 'CSM owns both retention + expansion, AM manages relationship only',
      shared_ownership: 'Shared/overlapping -- both have revenue targets on same accounts (conflict risk)',
      segment_dependent: 'Varies by segment -- different ownership models across segments'
    },
    // New: Retention metrics
    retention_metrics: {
      grr_below_80: 'GRR below 80% -- significant churn problem, retention is top priority',
      grr_80_90: 'GRR 80-90% -- room for improvement, retention needs focus',
      grr_90_95: 'GRR 90-95% -- solid retention, typical for healthy SaaS',
      grr_above_95: 'GRR above 95% -- strong retention, expansion is the bigger lever',
      dont_track: 'Does not track GRR/NRR yet'
    },
    nrr_current: {
      nrr_below_100: 'NRR below 100% -- contracting, churn outpaces expansion',
      nrr_100_110: 'NRR 100-110% -- slight growth, expansion just offsets churn',
      nrr_110_120: 'NRR 110-120% -- healthy expansion, typical for strong SaaS',
      nrr_120_140: 'NRR 120-140% -- strong expansion motion working well',
      nrr_above_140: 'NRR above 140% -- exceptional expansion, land-and-expand is proven'
    },
    retention_goal: {
      fix_churn: 'Fix churn first -- priority is stopping the bleeding before growing',
      maintain_grow: 'Maintain retention, accelerate expansion -- retention is OK, need more growth',
      optimize_both: 'Improve both retention and expansion -- need improvement across the board',
      maximize_expansion: 'Maximize expansion -- retention is strong, focus is aggressive growth'
    },
    deal_complexity_flags: {
      multi_year: 'Multi-year contracts (2+ year terms)',
      usage_ramps: 'Usage ramps (start small, grow over time)',
      professional_services: 'Professional services bundled with product',
      channel_referral: 'Channel/referral deals (partner-sourced)',
      co_sell: 'Co-sell deals (selling alongside a partner)',
      custom_pricing: 'Custom/negotiated pricing (no standard rate card)'
    },
    comp_admin_owner: {
      spreadsheet_owner: 'Spreadsheets managed by one person',
      no_process: 'No formal process',
      crm_basic: 'Basic CRM tracking + spreadsheets',
      comp_tool: 'Dedicated comp tool (CaptivateIQ, Spiff, etc.)',
      fully_integrated: 'Fully integrated comp system with automated calculations'
    },
    budget_constraint: {
      no_constraint: 'No specific budget constraint',
      soft_budget: 'Soft budget -- prefer to stay within range but flexible',
      hard_budget: 'Hard budget -- cannot exceed a specific amount'
    },
    special_arrangements: {
      none: 'No special arrangements -- everyone is on the standard plan',
      few_legacy: 'A few legacy deals (grandfathered rates or guarantees)',
      many_custom: 'Many custom arrangements -- significant variation across the team',
      transitioning: 'Currently transitioning off custom deals to a standard plan'
    },
    // Phase 3: Readiness Assessment
    plan_reason: {
      annual_planning: 'Annual planning cycle', underperformance: 'Team underperformance',
      turnover: 'High rep turnover', new_roles: 'New roles or segments',
      leadership_change: 'Leadership change', plan_broken: 'Current plan feels broken'
    },
    data_maturity: { low: 'Low -- early stage data', medium: 'Medium -- developing', high: 'High -- mature and reliable' },
    cross_functional_alignment: { aligned: 'Well aligned across teams', partial: 'Partially aligned', misaligned: 'Not aligned -- frequent disputes' },
    exception_culture: { never: 'Never -- consistent application', rare: 'Occasionally for clear reasons', frequent: 'Frequently', norm: 'Exceptions are the norm' },
    miss_response: { examine_all: 'Examine all factors equally', mostly_external: 'Focus on external factors', mostly_reps: 'Focus on rep execution', change_plan: 'Change the comp plan' },
    plan_stability: { '0': 'No mid-cycle changes', '1': 'One mid-cycle change', '2-3': '2-3 mid-cycle changes', '4+': '4+ changes -- frequent revisions' },
    outlier_tolerance: { celebrate: 'Celebrate it', accept: 'Accept it', uncomfortable: 'Feel uncomfortable', adjust: 'Want to adjust the plan' },
    comp_owner: { dedicated: 'Dedicated comp leader', revops: 'RevOps / Sales Ops', vp_sales: 'VP of Sales', finance: 'Finance', shared: 'Shared / unclear', no_one: 'No one' },
    // New Phase 1 fields
    segment_focus: {
      smb: 'SMB (small businesses)',
      mid_market: 'Mid-Market',
      enterprise: 'Enterprise (large organizations)',
      strategic: 'Strategic / Named Accounts',
      mixed: 'Mixed segments (different reps cover different segments)',
    },
    rep_tenure: {
      mostly_new: 'Mostly new (under 1 year in role)',
      mixed: 'Mixed tenure (blend of experienced and newer hires)',
      mostly_tenured: 'Mostly tenured (2+ years in role)',
      highly_tenured: 'Highly tenured (4+ years, deep customer relationships)',
    },
    comp_positioning: {
      below_market: 'Below market (offset with equity/mission/flexibility)',
      at_market: 'At market (50th percentile)',
      above_market: 'Above market (60th-75th percentile)',
      premium: 'Premium (75th+ percentile)',
    },
    // New Phase 3 fields
    current_clawback: {
      none: 'No clawbacks -- commission earned at close',
      partial: 'Partial clawback within a window',
      full: 'Full clawback within a window',
      holdback: 'Holdback model -- portion held and paid after retention period',
    },
    current_spif_usage: {
      never: 'Never -- everything runs through core plan',
      rare: 'Occasionally (1-2 per year)',
      regular: 'Regularly (every quarter or more)',
      constant: 'Constantly (multiple active SPIFs at any time)',
    },
    current_ramp: {
      no_ramp: 'No formal ramp -- full quota from day one',
      '1_2_months': '1-2 month ramp',
      '3_4_months': '3-4 month ramp (standard SaaS)',
      '5_6_months': '5-6 month ramp',
      '7_plus': '7+ month ramp (enterprise/complex)',
    },
    // New Phase 4 fields
    // Segment labels
    segments: {
      smb: 'SMB', mid_market: 'Mid-Market', enterprise: 'Enterprise',
      strategic: 'Strategic / Key Accounts', channel: 'Channel / Partners',
      shared: 'Shared Across Segments',
    },
    support_role_alignment: {
      shared_sdr: 'SDR/BDR team is shared across segments (one comp plan)',
      shared_se: 'SE team is shared across segments (one comp plan)',
      shared_csm: 'CSM team is shared across segments (one comp plan)',
      all_dedicated: 'All support teams are segment-dedicated',
    },
    // Per-combo attainment (reuses same values as historical_attainment but with new_role option)
    combo_attainment: {
      under_30: 'Under 30% of reps hit quota',
      '30_50': '30-50% of reps hit quota',
      '50_65': '50-65% of reps hit quota (healthy range)',
      '65_80': '65-80% of reps hit quota (strong)',
      over_80: '80%+ of reps hit quota (quotas may be too easy)',
      new_role: 'New role, no historical data',
    },
    // New Phase 4 fields
    rollout_timeline: {
      asap: 'As soon as possible (urgent)',
      next_quarter: 'Next quarter',
      next_fiscal: 'Next fiscal year',
      exploring: 'Just exploring (no firm timeline)',
    },
    quota_setting_process: {
      top_down: 'Top-down (revenue target divided by headcount)',
      bottom_up: 'Bottom-up (territory/account analysis)',
      blended: 'Blended (top-down validated against bottom-up)',
      historical: 'Historical + growth factor',
      no_process: 'No formal process',
    },
    payout_frequency: {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      semi_annual: 'Semi-annual',
      flexible: 'No preference -- recommend what works best',
    },
    target_attainment: {
      '40_50': '40-50% of reps (stretch targets, high upside)',
      '50_65': '50-65% of reps (industry standard)',
      '65_80': '65-80% of reps (conservative targets)',
      unsure: 'Not sure -- recommend what is appropriate',
    },
    ae_product_name: {
      gpv: 'Payments (Gross Payment Volume)',
      consumption: 'Consumption / Usage-based',
      mrr: 'Monthly Recurring Revenue',
      units: 'Units / Licenses',
      other: 'Custom product-specific metric',
    },
    geographic_spread: {
      single_city: 'Single metro area (team concentrated in one city)',
      us_distributed: 'US distributed (remote or multi-office across US)',
      us_plus_intl: 'US + international (US-based with some international reps)',
      multi_country: 'Multi-country (significant sales teams in multiple countries)',
    },
    equity_comp: {
      significant: 'Significant equity (major part of total comp, offsets lower cash OTE)',
      modest: 'Modest equity grants (some equity, cash comp is primary)',
      minimal: 'Token / minimal equity (not meaningful to comp decisions)',
      none: 'No equity for sales team',
    },
    leadership_priorities: {
      growth: 'Revenue growth at all costs',
      profitability: 'Profitable growth (watch cost of sales)',
      retention: 'Customer retention (protect install base)',
      market_expansion: 'Market expansion (new segments, verticals, geographies)',
      product_adoption: 'Product adoption (drive adoption of new/strategic products)',
      talent: 'Talent retention (stop losing top performers)',
    },
    voluntary_attrition: {
      under_10: 'Under 10% (very low, team is stable)',
      '10_20': '10-20% (normal SaaS range)',
      '20_30': '20-30% (elevated, worth investigating)',
      '30_40': '30-40% (high, likely losing top performers)',
      over_40: '40%+ (critical, comp redesign urgent)',
      new_team: 'Too new to measure',
    },
    performance_distribution: {
      top_heavy: 'Top-heavy (top 20% carry 60%+ of revenue)',
      bell_curve: 'Bell curve (normal distribution)',
      bimodal: 'Bimodal (strong performers and underperformers, few in between)',
      flat: 'Fairly even (most reps produce similar results)',
      unknown: 'Unknown (haven\'t analyzed)',
    },
  }

  const roles = (intake.role_types || []).map(r => labels.role_types[r] || r).join(', ')

  // Declare multi-segment and variant variables early (used in comboSummary and later)
  const isMultiSegment = intake._is_multi_segment || intake.has_segments === 'multiple'
  const hasVariants = intake._has_variants || false
  const comboDetails = intake._combo_details || []
  const combos = intake._role_segment_combos || comboDetails.map(c => c.id) || []

  // Build combo summary for prompt
  const comboSummary = (isMultiSegment || hasVariants) && combos.length > 0
    ? (comboDetails.length > 0
        ? comboDetails.map(c => c.label).join(', ')
        : combos.map(comboId => {
            const parts = comboId.split('__')
            if (parts[1]) return `${labels.segments[parts[1]] || parts[1]} ${labels.role_types[parts[0]] || parts[0]}`
            return labels.role_types[parts[0]] || parts[0]
          }).join(', '))
    : roles

  // Build sales operations context block (backward compatible -- skips missing fields)
  const opsLines = []
  if (intake.deal_structure) opsLines.push(`- Deal Structure: ${labels.deal_structure[intake.deal_structure] || intake.deal_structure}`)
  if (intake.revenue_mix) opsLines.push(`- Revenue Type Mix: ${labels.revenue_mix[intake.revenue_mix] || intake.revenue_mix}`)
  if (intake.plan_status) opsLines.push(`- Current Plan Status: ${labels.plan_status[intake.plan_status] || intake.plan_status}`)
  if (intake.territory_model) opsLines.push(`- Territory Model: ${labels.territory_model[intake.territory_model] || intake.territory_model}`)
  if (intake.selling_model) opsLines.push(`- Selling Model: ${labels.selling_model[intake.selling_model] || intake.selling_model}`)
  if (intake.product_complexity) opsLines.push(`- Product Portfolio: ${labels.product_complexity[intake.product_complexity] || intake.product_complexity}`)
  if (intake.industry_vertical) opsLines.push(`- Industry / Vertical: ${labels.industry_vertical[intake.industry_vertical] || intake.industry_vertical}`)
  if (intake.enablement_maturity) opsLines.push(`- Enablement Maturity: ${labels.enablement_maturity[intake.enablement_maturity] || intake.enablement_maturity}`)
  if (intake.churn_drivers?.length) opsLines.push(`- Primary Churn Drivers: ${(intake.churn_drivers || []).map(d => labels.churn_drivers[d] || d).join(', ')}`)
  if (intake.historical_attainment) opsLines.push(`- Historical Quota Attainment: ${labels.historical_attainment[intake.historical_attainment] || intake.historical_attainment}`)
  if (intake.credit_overlap) opsLines.push(`- Credit & Attribution Model: ${labels.credit_overlap[intake.credit_overlap] || intake.credit_overlap}`)
  if (intake.sdr_ae_model) opsLines.push(`- SDR-AE Handoff Model: ${labels.sdr_ae_model[intake.sdr_ae_model] || intake.sdr_ae_model}`)
  if (intake.manager_roles) opsLines.push(`- Manager Selling Involvement: ${labels.manager_roles[intake.manager_roles] || intake.manager_roles}`)
  if (intake.manager_functions?.length) opsLines.push(`- Manager Functions: ${(intake.manager_functions || []).map(f => labels.manager_functions[f] || f).join(', ')}`)
  if (intake.general_manager_teams?.length) opsLines.push(`- Cross-Function Manager Covers: ${(intake.general_manager_teams || []).map(t => labels.role_types[t] || t).join(', ')} teams`)
  // Multiple cross-function managers (new system)
  const xfnCount = parseInt(intake.general_manager_count) || 0
  for (let i = 1; i <= xfnCount; i++) {
    const teams = intake[`general_manager_${i}_teams`]
    if (teams?.length) {
      opsLines.push(`- Cross-Function Manager #${i} Covers: ${teams.map(t => labels.role_types[t] || t).join(', ')} teams`)
    }
  }
  if (intake.manager_levels) opsLines.push(`- Management Levels: ${labels.manager_levels[intake.manager_levels] || intake.manager_levels}`)
  if (intake.manager_selling) opsLines.push(`- Frontline Manager Model: ${labels.manager_selling[intake.manager_selling] || intake.manager_selling}`)
  if (intake.post_sale_ownership) opsLines.push(`- Post-Sale Ownership (AM/CSM): ${labels.post_sale_ownership[intake.post_sale_ownership] || intake.post_sale_ownership}`)
  if (intake.retention_metrics) opsLines.push(`- Gross Revenue Retention (GRR): ${labels.retention_metrics[intake.retention_metrics] || intake.retention_metrics}`)
  if (intake.nrr_current) opsLines.push(`- Net Revenue Retention (NRR): ${labels.nrr_current[intake.nrr_current] || intake.nrr_current}`)
  if (intake.retention_goal) opsLines.push(`- Retention Priority: ${labels.retention_goal[intake.retention_goal] || intake.retention_goal}`)
  if (intake.support_role_alignment?.length) opsLines.push(`- Support Role Alignment: ${(intake.support_role_alignment || []).map(s => labels.support_role_alignment[s] || s).join(', ')}`)
  if (intake.deal_complexity_flags?.length) opsLines.push(`- Complex Deal Types: ${(intake.deal_complexity_flags || []).map(d => labels.deal_complexity_flags[d] || d).join(', ')}`)
  if (intake.rep_control) opsLines.push(`- Rep Control Over Outcomes: ${labels.rep_control?.[intake.rep_control] || intake.rep_control}`)
  if (intake.quota_confidence) opsLines.push(`- Quota Setting Confidence: ${intake.quota_confidence}/5`)
  if (intake.quota_setting_process) opsLines.push(`- Quota Setting Process: ${labels.quota_setting_process[intake.quota_setting_process] || intake.quota_setting_process}`)
  if (intake.target_attainment) opsLines.push(`- Target Attainment Philosophy: ${labels.target_attainment[intake.target_attainment] || intake.target_attainment}`)
  if (intake.performance_distribution) opsLines.push(`- Performance Distribution: ${labels.performance_distribution[intake.performance_distribution] || intake.performance_distribution}`)
  if (intake.voluntary_attrition) opsLines.push(`- Voluntary Attrition Rate: ${labels.voluntary_attrition[intake.voluntary_attrition] || intake.voluntary_attrition}`)
  if (intake.payout_frequency) opsLines.push(`- Payout Frequency: ${labels.payout_frequency[intake.payout_frequency] || intake.payout_frequency}`)

  // Build baseline block (only for redesign/refresh, skips for net_new)
  const hasBaseline = intake.plan_status && intake.plan_status !== 'net_new' && (intake.current_ote_range || intake.current_pay_mix || intake.plan_pain_points?.length)
  const baselineLines = []
  if (intake.current_ote_range) baselineLines.push(`- Current OTE Range: ${labels.current_ote_range[intake.current_ote_range] || intake.current_ote_range}`)
  if (intake.current_pay_mix) baselineLines.push(`- Current Pay Mix: ${labels.current_pay_mix[intake.current_pay_mix] || intake.current_pay_mix}`)
  if (intake.plan_pain_points?.length) baselineLines.push(`- Pain Points with Current Plan: ${(intake.plan_pain_points || []).map(p => labels.plan_pain_points[p] || p).join(', ')}`)
  if (intake.current_plan_description) baselineLines.push(`- Current Plan Description: ${intake.current_plan_description}`)
  if (intake.special_arrangements) baselineLines.push(`- Special Arrangements: ${labels.special_arrangements[intake.special_arrangements] || intake.special_arrangements}`)
  if (intake.current_clawback) baselineLines.push(`- Current Clawback Policy: ${labels.current_clawback[intake.current_clawback] || intake.current_clawback}`)
  if (intake.current_ramp) baselineLines.push(`- Current Ramp Period: ${labels.current_ramp[intake.current_ramp] || intake.current_ramp}`)
  if (intake.current_spif_usage) baselineLines.push(`- Current SPIF Usage: ${labels.current_spif_usage[intake.current_spif_usage] || intake.current_spif_usage}`)
  const baselineBlock = hasBaseline ? `

CURRENT PLAN BASELINE:
${baselineLines.join('\n')}` : ''

  // Build plan context block (applicable to all plan types)
  const planContextLines = []
  if (intake.comp_admin_owner) planContextLines.push(`- Comp Administration: ${labels.comp_admin_owner[intake.comp_admin_owner] || intake.comp_admin_owner}`)
  if (intake.budget_constraint) planContextLines.push(`- Budget Constraint: ${labels.budget_constraint[intake.budget_constraint] || intake.budget_constraint}`)
  if (intake.budget_amount) planContextLines.push(`- Budget Amount: ${intake.budget_amount}`)
  if (intake.special_scenarios) planContextLines.push(`- Unique Situations / Edge Cases: ${intake.special_scenarios}`)
  if (intake.rollout_timeline) planContextLines.push(`- Rollout Timeline: ${labels.rollout_timeline[intake.rollout_timeline] || intake.rollout_timeline}`)
  const planContextBlock = planContextLines.length > 0 ? `

PLAN CONTEXT:
${planContextLines.join('\n')}` : ''
  
  const opsBlock = opsLines.length > 0 ? `

SALES OPERATIONS CONTEXT:
${opsLines.join('\n')}` : ''

  // Build goals & constraints block (new Phase 4 fields)
  const goalsLines = []
  if (intake.rollout_timeline) goalsLines.push(`- Rollout Timeline: ${labels.rollout_timeline[intake.rollout_timeline] || intake.rollout_timeline}`)
  if (intake.quota_setting_process) goalsLines.push(`- Quota Setting Process: ${labels.quota_setting_process[intake.quota_setting_process] || intake.quota_setting_process}`)
  if (intake.payout_frequency) goalsLines.push(`- Preferred Payout Frequency: ${labels.payout_frequency[intake.payout_frequency] || intake.payout_frequency}`)
  if (intake.target_attainment) goalsLines.push(`- Target Attainment Distribution: ${labels.target_attainment[intake.target_attainment] || intake.target_attainment}`)
  const goalsBlock = goalsLines.length > 0 ? `

GOALS & CONSTRAINTS:
${goalsLines.join('\n')}` : ''

  // Build readiness block (backward compatible -- skips if no readiness data)
  const hasReadiness = intake.plan_reason || intake.data_maturity

  // Build role-segment-variant combo block
  let roleSegmentBlock = ''

  if ((isMultiSegment || hasVariants) && combos.length > 0) {
    const comboLines = []

    if (isMultiSegment) {
      comboLines.push(`Organization Type: Multi-segment (${(intake.segments || []).map(s => labels.segments[s] || s).join(', ')})`)
    }
    if (hasVariants) {
      const variantRoles = ['ae', 'sdr', 'am', 'csm'].filter(r => intake[`has_${r}_variants`] === 'variants')
      comboLines.push(`Role Variants: ${variantRoles.map(r => labels.role_types[r] || r).join(', ')} have specialized sub-types`)
    }
    comboLines.push(`Total Distinct Comp Plans Required: ${intake._plan_count || combos.length}`)
    comboLines.push('')

    combos.forEach(comboId => {
      // Find combo detail metadata if available
      const detail = comboDetails.find(c => c.id === comboId) || {}
      const parts = comboId.split('__')
      const roleOrVariant = parts[0]
      const segment = parts[1] || null

      // Build display label
      let comboLabel = detail.label || ''
      if (!comboLabel) {
        const roleLabel = labels.role_types[roleOrVariant] || roleOrVariant
        comboLabel = segment ? `${labels.segments[segment] || segment} ${roleLabel}` : roleLabel
      }

      // Check if this combo uses "same as" another
      const sameAsVal = intake[`same_as__${comboId}`]
      if (sameAsVal && sameAsVal.startsWith('same__')) {
        const sourceId = sameAsVal.replace('same__', '')
        const srcDetail = comboDetails.find(c => c.id === sourceId)
        const srcLabel = srcDetail?.label || sourceId
        comboLines.push(`[${comboLabel}] -> Same compensation structure as ${srcLabel}`)
        comboLines.push('')
        return
      }

      comboLines.push(`[${comboLabel}]`)

      // Custom role description
      if (detail.isCustom && detail.focus) {
        comboLines.push(`  - Role Type: Custom`)
        comboLines.push(`  - Description: ${detail.focus}`)
      }
      // Variant metadata (focus and primary metric)
      else if (detail.focus) comboLines.push(`  - Role Focus: ${detail.focus.replace(/_/g, ' ')}`)
      if (detail.metric) {
        const metricLabels = { gpv: 'GPV (Gross Payment Volume)', usage: 'Usage / Consumption Volume', seats: 'Seats / Licenses', mrr: 'MRR', acv: 'ACV', arr: 'ARR', other: 'Other' }
        const metricLabel = metricLabels[detail.metric] || detail.metric.replace(/_/g, ' ').toUpperCase()
        comboLines.push(`  - Primary Metric: ${metricLabel}`)
      }

      const headcount = intake[`headcount__${comboId}`]
      if (headcount) comboLines.push(`  - Headcount: ${headcount} reps`)
      const dealSize = intake[`deal_size__${segment}`] || intake[`deal_size__${comboId}`] || intake.deal_size
      if (dealSize) comboLines.push(`  - Deal Size: ${labels.deal_size[dealSize] || dealSize}`)
      const cycle = intake[`sales_cycle__${segment}`] || intake[`sales_cycle__${comboId}`] || intake.sales_cycle
      if (cycle) comboLines.push(`  - Sales Cycle: ${labels.sales_cycle[cycle] || cycle}`)
      const ote = intake[`ote_range__${comboId}`]
      if (ote) comboLines.push(`  - Current OTE: ${labels.current_ote_range[ote] || ote}`)
      const payMix = intake[`pay_mix__${comboId}`]
      if (payMix) comboLines.push(`  - Current Pay Mix: ${labels.current_pay_mix[payMix] || payMix}`)
      const attainment = intake[`attainment__${comboId}`]
      if (attainment) comboLines.push(`  - Historical Attainment: ${labels.combo_attainment[attainment] || attainment}`)
      comboLines.push('')
    })

    roleSegmentBlock = `\n\nROLE-SPECIFIC COMPENSATION DETAILS:\n${comboLines.join('\n')}`
  }
  const readinessBlock = hasReadiness ? `

ORGANIZATIONAL READINESS ASSESSMENT (Module 0):
- Reason for Plan Design: ${labels.plan_reason[intake.plan_reason] || intake.plan_reason || 'Not provided'}
- Data & Process Maturity: ${labels.data_maturity[intake.data_maturity] || intake.data_maturity || 'Not provided'}
- Cross-Functional Alignment: ${labels.cross_functional_alignment[intake.cross_functional_alignment] || intake.cross_functional_alignment || 'Not provided'}
- Exception Culture: ${labels.exception_culture[intake.exception_culture] || intake.exception_culture || 'Not provided'}
- Response to Misses: ${labels.miss_response[intake.miss_response] || intake.miss_response || 'Not provided'}
- Plan Stability (last 12mo): ${labels.plan_stability[intake.plan_stability] || intake.plan_stability || 'Not provided'}
- Outlier Tolerance: ${labels.outlier_tolerance[intake.outlier_tolerance] || intake.outlier_tolerance || 'Not provided'}
- Comp Plan Owner: ${labels.comp_owner[intake.comp_owner] || intake.comp_owner || 'Not provided'}
- Calculated Readiness Score: ${intake.readiness_score || 'N/A'}% (${intake.readiness_level || 'N/A'})
${intake.readiness_flags?.length > 0 ? '- Readiness Flags:\n' + intake.readiness_flags.map(f => `  * ${f}`).join('\n') : ''}

USE THIS READINESS DATA to:
1. Set confidence_level based on readiness_score (High >=75%, Medium 50-74%, Low <50%)
2. Reference specific readiness flags in your global_warnings
3. Adjust plan complexity -- low readiness = simpler plans, fewer measures, no decelerators
4. Flag non-comp root causes if plan_reason suggests them
5. Connect outlier_tolerance to cap/uncap recommendations
6. Connect exception_culture to plan governance warnings` : ''

  // For multi-segment, deal_size and sales_cycle are per-combo, not org-level
  const orgDealSize = intake.deal_size ? `${labels.deal_size[intake.deal_size] || intake.deal_size}` : (isMultiSegment ? 'See per-segment details below' : 'Not provided')
  const orgSalesCycle = intake.sales_cycle ? `${labels.sales_cycle[intake.sales_cycle] || intake.sales_cycle}` : (isMultiSegment ? 'See per-segment details below' : 'Not provided')
  const orgAttainment = intake.historical_attainment ? `${labels.historical_attainment[intake.historical_attainment] || intake.historical_attainment}` : (isMultiSegment ? 'See per-segment details below' : 'Not provided')

  // Build the intake context block (shared across all pipeline stages)
  const intakeContext = `COMPANY PROFILE:
- Company Stage: ${labels.company_stage[intake.company_stage] || intake.company_stage}
- Team Size: ${labels.team_size[intake.team_size] || intake.team_size}
- Roles to Design For: ${comboSummary}
- Organization Structure: ${isMultiSegment ? `Multi-segment (${(intake.segments || []).map(s => labels.segments[s] || s).join(', ')})` : 'Single segment'}
- Total Comp Plans: ${isMultiSegment ? (intake._plan_count || combos.length) : (intake.role_types || []).length}
- Primary Sales Motion: ${labels.sales_motion[intake.sales_motion] || intake.sales_motion}
- Average Deal Size (ACV): ${orgDealSize}
- Sales Cycle Length: ${orgSalesCycle}
- Historical Quota Attainment: ${orgAttainment}
- Quota Setting Confidence: ${labels.quota_confidence[intake.quota_confidence] || intake.quota_confidence}
- Rep Control Over Outcomes: ${labels.rep_control[intake.rep_control] || intake.rep_control}
- Hiring Plan (next 12 months): ${labels.hiring_plan[intake.hiring_plan] || intake.hiring_plan}
- Customer Segment: ${labels.segment_focus[intake.segment_focus] || intake.segment_focus || (isMultiSegment ? 'Multi-segment' : 'Not provided')}
- Comp Market Positioning: ${labels.comp_positioning[intake.comp_positioning] || intake.comp_positioning || 'Not provided'}
- Team Tenure: ${labels.rep_tenure[intake.rep_tenure] || intake.rep_tenure || 'Not provided'}
- Geographic Coverage: ${labels.geographic_spread[intake.geographic_spread] || intake.geographic_spread || 'Not provided'}
${intake.equity_comp ? '- Equity Compensation: ' + (labels.equity_comp[intake.equity_comp] || intake.equity_comp) : ''}
${intake.leadership_priorities?.length ? '- Leadership Priorities: ' + intake.leadership_priorities.map(p => labels.leadership_priorities[p] || p).join(', ') : ''}
${intake.target_revenue ? '- Team Revenue Target: ' + intake.target_revenue : ''}
${opsBlock}
${baselineBlock}
${planContextBlock}
${goalsBlock}
${roleSegmentBlock}
${readinessBlock}
`

  // Store on the function for reuse
  buildUserPrompt._lastIntakeContext = intakeContext
  buildUserPrompt._lastIsMultiSegment = isMultiSegment
  buildUserPrompt._lastHasVariants = hasVariants
  buildUserPrompt._lastPlanCount = intake._plan_count || combos.length

  return `Design a comprehensive compensation plan for the following company. Apply all 21 modules of the CompFrame rules engine. Generate recommendations for each ${(isMultiSegment || hasVariants) ? 'distinct comp plan (role-segment-variant combination)' : 'role'}, including cross-role alignment analysis, anti-pattern detection, crediting rules, quota methodology, governance, transition planning, and payout mechanics.

${intakeContext}

INSTRUCTIONS:
1. Evaluate organizational readiness based on the inputs and set confidence accordingly.
2. Apply stage-specific defaults from Module 11 as the foundation.
3. Apply sales operations rules (deal structure, revenue mix, territory, selling model, product complexity, enablement maturity, churn drivers, historical attainment, industry vertical, plan status) to refine recommendations.
4. Generate role-specific recommendations using Modules 1-8.
5. Run cross-role alignment checks from Module 9.
6. Run anti-pattern detection from Module 12.
7. Check all cross-module dependencies from Module 13.
8. Include explicit assumptions and 3-5 what-if scenarios. Each scenario MUST include concrete numeric adjustments in role_impacts -- specify actual adjusted OTE numbers, base_pct values, and/or measure weight changes. Only include fields that would change. severity should be "high" if the scenario would fundamentally alter the plan, "medium" for significant but contained changes, "low" for minor tweaks. Every scenario must impact at least one role with at least one numeric adjustment.
9. Use enablement_maturity to adjust ramp timelines. Strong enablement compresses ramp by 1-2 months. Minimal enablement extends ramp by 2-3 months. Flag this explicitly in ramp recommendations.
10. Use churn_drivers to tailor clawback policy. If churn is primarily poor_fit, recommend full clawbacks with 90-day windows. If churn is from product_gaps, onboarding, or support, recommend partial or no clawbacks since those are outside rep control. If unknown, flag as risk and recommend tracking before aggressive clawbacks.
11. Use historical_attainment to calibrate accelerator thresholds. Under 30% signals quotas are broken -- recommend resetting before designing accelerators. 50-70% is healthy and supports standard curves. Over 90% signals quotas may be too easy -- recommend raising targets or steepening accelerators.
12. BASELINE ANALYSIS MODE: If CURRENT PLAN BASELINE data is provided, shift from greenfield design to gap analysis:
   a. Reference the current OTE range and explain whether your recommendation represents an increase, decrease, or hold -- and why.
   b. If the current pay mix differs from your recommendation, explicitly flag the transition risk and suggest a phased approach if the shift is >10 percentage points.
   c. Address EACH pain point listed. For every pain point, identify which specific recommendation element fixes it and explain the mechanism.
   d. In the summary, lead with "Based on your current plan's challenges..." rather than designing as if from scratch.
   e. In global_warnings, flag any pain points that comp redesign alone cannot fix (e.g., territory_inequity may need territory rebalancing before plan changes).
13. Use industry_vertical to apply vertical-specific comp norms where relevant (e.g., healthcare typically has longer cycles and higher base, fintech often supports aggressive variable).
14. Use credit_overlap and sdr_ae_model (if provided) to design cross-role credit attribution rules. No_rules or ad_hoc should trigger a strong recommendation to formalize. Double credit should include total credit cap guidance.
15. Use comp_admin_owner to tailor plan administration recommendations. Spreadsheet_owner or no_process should trigger recommendations for comp tool adoption. Finance-owned processes should include reconciliation guidance.
16. Use budget_constraint and budget_amount (if provided) to frame cost modeling. Hard budgets require explicit trade-off recommendations (e.g., lower OTE but richer accelerators, or fewer roles covered). Include total plan cost at 100% and 120% attainment.
17. Use special_scenarios and deal_complexity_flags (if provided) to generate edge case policies. Each complex deal type needs a specific comp treatment recommendation.
18. Use special_arrangements (if provided) to address transition risk. Messy arrangements require a phased migration plan.
19. Every recommendation should include a rationale explaining WHY, not just WHAT.
20. AUDIT VALIDATIONS (run these checks on your own output before finalizing):
    a. QUOTA:OTE RATIO: For every role, calculate quota / annual variable comp. If outside 3.5-5x, explain why in the role's quota rationale. If above 6x, add a role warning AND a global warning. State the calculated ratio explicitly in the quota.multiple field (e.g., "5.2x variable comp ($520K quota vs $100K annual variable)").
    b. SDR OTE FLOOR: If any SDR role has OTE below $70K, raise it to $70K minimum and note why. No exceptions for stage or equity.
    c. ATTAINMENT BENCHMARK: If historical_attainment data is provided, compare against the 50-65% healthy range. If below 50%, add to global_warnings with specific guidance (quota recalibration, not just comp redesign). If above 80%, recommend quota increases.
    d. SE/OVERLAY CHECK: If SE or overlay roles are included, verify: (1) pay mix is 75/25 to 80/20, (2) measures are team-based not individual deal quota, (3) overlay credit does not exceed 15% of deal value. Flag violations in role warnings.

STRATEGY & ANALYSIS SECTIONS (populate fully for consulting-grade output):
15. EXECUTIVE BRIEFING: Write comp_philosophy as 2-3 substantive paragraphs a VP Sales would present to their board. Articulate the "why" behind the overall design approach. Include 3-5 key_design_decisions with real alternatives considered and rejected.
16. COST MODEL: Calculate total plan cost using the role-level OTE recommendations and team_size from intake. All cost fields MUST be numbers, not strings. Show costs at 80%, 100%, 120%, and 150% attainment. Variable comp scales with attainment; base stays fixed. Estimate cost_of_sales_pct using the deal_size and team_size data. If budget_constraint data was provided, compare your total cost to the stated budget.
17. IMPLEMENTATION: Design a 3-4 phase rollout plan (Pre-Launch, Soft Launch, Full Rollout, Optimization). Include a communication_plan with actual draft copy for the team announcement, manager talking points, and 5-7 anticipated rep FAQ entries with honest answers. Include 3-5 change_management_risks with mitigations.
18. BENCHMARKING: Position each role's compensation against market data. Reference Bridge Group, ICONIQ Growth, CaptivateIQ, and RepVue as data sources. Flag any deliberate deviations from benchmarks and explain why.
19. BASELINE COMPARISON: If CURRENT PLAN BASELINE data was provided, set baseline_comparison.has_baseline to true and populate the full section. Include a change_summary array with every material change, the transition approach, and estimated impact. If no baseline data, set has_baseline to false and leave other fields as empty defaults.
20. MEASUREMENT & GOVERNANCE: Recommend reporting cadence, 5-7 KPIs to track plan health, trigger events for mid-cycle review, and admin recommendations calibrated to the company's data_maturity level.
21. SLIDE CONTENT: Distill the full analysis into slide-ready content. This drives a 12-15 slide board presentation. Requirements:
    a. Each bullet should be a complete thought that stands on its own. Write as if the VP Sales will read these verbatim. Keep bullets to 1-2 sentences max.
    b. Include current_plan_bullets ONLY if baseline data was provided. Empty array otherwise.
    c. Include one entry in role_detail_slides for EACH role, with 4-6 bullets covering that role's plan and speaker_notes with anticipated questions.
    d. Include appendix_attainment with earnings at 80/100/120/150% for each role (use the actual calculated numbers from cost_model logic).
    e. Include appendix_methodology bullets.
22. CROSS-ROLE ALIGNMENT: Populate as an OBJECT (not array) with pipeline_flow, crediting_notes, cost_ratio, and alignment_warnings fields. This gives structured analysis of how roles interact.
23. FIELD NAMING: Use "rationale" (not "note") in role sub-objects for ote, pay_mix, quota, accelerators, decelerators, ramp, and clawback. Use "description" (not "note") for measure descriptions. Use "multiple" (not "ratio") for quota multiple. Use "type" (not "recommendation") for cap_policy.
24. CREDITING RULES (Module 14): Generate crediting_rules based on credit_overlap, selling_model, and role_types. Include specific scenario-based rules for every handoff point (SDR->AE, AE->AM, overlay). Define total credit cap. If credit_overlap is "no_rules", flag as critical and recommend formalization.
25. QUOTA METHODOLOGY (Module 15): Generate quota_methodology based on quota_setting_process, quota_confidence, target_attainment, and historical_attainment. Recommend a setting process, calibration target, adjustment triggers, and communication guidance.
26. GOVERNANCE (Module 17): Generate governance section based on comp_admin_owner and data_maturity. Gate plan complexity to admin capability. Include review cadence, KPIs, exception process, and amendment rules.
27. TRANSITION PLAN (Module 18): Generate transition_plan based on rollout_timeline, plan_status, special_arrangements, and rep_tenure. Include communication sequence with specific audiences, timing, and key messages. Assess risk level based on magnitude of changes from baseline.
28. PAYOUT MECHANICS (Module 20): Generate payout_mechanics based on payout_frequency, sales_cycle, and comp_admin_owner. Recommend frequency, calculation method, payment timing, and dispute resolution process.
29. Use comp_positioning to calibrate OTE ranges in Module 1B. below_market -> lower end of segment range but flag attrition risk. at_market -> middle of range. above_market -> upper quartile. premium -> top of range.
30. MULTI-SEGMENT AND ROLE VARIANT HANDLING: If ROLE-SPECIFIC COMPENSATION DETAILS are provided, generate a SEPARATE role object for EACH distinct comp plan. CRITICAL requirements:
    a. KEY FORMAT: For segment+variant combos use "segment_variant_role" (e.g., "smb_new_business_ae"). For segment-only use "segment_role" (e.g., "smb_ae"). For variant-only use "variant_role" (e.g., "new_business_ae", "outbound_sdr", "expansion_am"). Single roles with no segment or variant use base key (e.g., "ae").
    b. CALIBRATION: Use the per-combo deal_size, sales_cycle, OTE, pay_mix, attainment, AND role focus/metric data to calibrate EACH combo independently. A New Business AE measured on ARR needs different measures, accelerators, and thresholds than a Retention AE measured on GRR, even at the same company.
    c. ROLE FOCUS drives comp structure: new_business = aggressive variable, lower base; expansion = moderate variable, upsell/cross-sell measures; retention = high base, GRR/NRR measures; full_cycle = blended measures with weighted components; product_specific = metric-appropriate measurement periods and quota methodology.
    d. PRIMARY METRIC drives quota methodology: ARR/ACV = standard booking-based quotas; GPV = volume-based, trailing actuals, longer measurement windows; consumption/usage = usage-based comp with minimum thresholds and rolling averages; GRR = retention rate targets; NRR = net retention combining retention + expansion.
    e. For combos marked "Same as [other combo]", generate identical comp structures but with distinct labels. Reference the source combo in the rationale.
    f. Cross-role alignment analysis must account for segment AND variant boundaries: a New Business AE handing off to an Expansion AE is a different handoff than SDR-to-AE. Include crediting rules for customer lifecycle transitions.
    g. The cost_model must show subtotals by segment (if multi-segment) and a grand total. Include all variant roles in the roll-up.
    h. Slide content should include comparison views showing how comp differs across segments/variants for the same base role.
    i. SDR VARIANTS: Outbound SDRs get more aggressive pay mix (55/45 to 50/50) with activity + pipeline measures. Inbound SDRs get higher base (65/35 to 60/40) with lead response + conversion measures. Hybrid SDRs blend both.
    j. AM VARIANTS: Renewal-focused AMs get high base (70/30+) measured on GRR. Expansion-focused AMs get moderate variable (60/40) measured on expansion revenue. Full Book AMs get dual-weighted measures.
    k. MANAGER VARIANTS: Player-coach managers carry 30-50% personal quota weight plus team metrics. Non-selling managers have 100% team-based variable with metrics like team attainment rate, pipeline health, and rep development.
    l. If no per-combo detail is provided (single-segment, no variants), use org-level data and generate one role object per role as before.
31. Use rep_tenure to calibrate change management risk in the transition plan. Highly tenured teams require more communication and slower rollout. Mostly new teams can absorb change faster.
32. COST MODEL (Module 16): If target_revenue is provided, calculate cost-of-sales ratio. Include ramp costs from hiring_plan. Compare against budget_constraint if provided. All cost fields must be numbers. CRITICAL: Use per-role headcount data (headcount__[combo]) to calculate accurate role-level costs. Multiply each role's recommended OTE by its headcount for base cost at 100%. Scale variable comp for 80%, 120%, and 150% scenarios. If headcount is not provided for a role, estimate based on team_size and typical org ratios, but flag the assumption. Include a headcount summary table in the cost model showing role, headcount, OTE, total base, and total variable at target.
33. VOLUNTARY ATTRITION ANALYSIS: Use voluntary_attrition to calibrate urgency and root cause analysis. Under 10% = plan is working, focus on optimization. 10-20% = normal, check if attrition is concentrated among top performers (different problem than even attrition). 20-30% = investigate whether comp is the driver or a symptom. Over 30% = treat as crisis, recommend immediate OTE adjustment before plan redesign. Always reference attrition in the executive briefing and include estimated replacement cost in cost_model.
34. PERFORMANCE DISTRIBUTION DESIGN: Use performance_distribution to shape accelerator curves. top_heavy = steep accelerators above 100%, lower kickers below (reward the stars). bell_curve = standard graduated curve, smooth transitions. bimodal = flag that the comp plan may not be the problem -- recommend territory/enablement audit. flat = moderate accelerators, focus on MBO differentiation. unknown = recommend implementing performance analytics before designing aggressive variable structures.
35. LEADERSHIP PRIORITIES ALIGNMENT: Every recommendation should tie back to stated leadership_priorities. If growth, weight new logo measures higher and recommend aggressive accelerators. If profitability, include cost-of-sales guardrails and efficiency metrics. If retention, weight GRR/NRR higher and add retention gates. If product_adoption, recommend product-specific SPIFs or measure weights. If talent, validate that OTE positioning and accelerator potential are competitive. Include a "Priority Alignment" paragraph in the executive briefing showing how the plan design maps to each stated priority.
36. GEOGRAPHIC COMPENSATION: Use geographic_spread to calibrate OTE benchmarking. single_city = use local market data, note the specific market. us_distributed = use national median, but note that top-of-market cities may need adjustment. us_plus_intl = recommend separate US and international OTE bands. multi_country = strongly recommend localized comp bands per country/region, include a note about local labor law implications. In benchmarking section, note geographic assumptions.
37. EQUITY IN TOTAL COMP: Use equity_comp to contextualize cash OTE recommendations. significant = total comp (cash + equity) should be the benchmark, not cash alone. Note that cash OTE can sit 10-20% below market if equity makes up the gap. modest = equity is a retention tool, not a comp substitute. Cash OTE should still be competitive. minimal or none = cash OTE must stand on its own. Flag if comp_positioning is below_market AND equity is minimal/none -- this is a talent risk.

Generate the complete plan as JSON. Be comprehensive and generate ALL sections including plan_name, executive_briefing, cost_model, implementation, benchmarking, baseline_comparison, slide_content, cross_role_alignment, scenarios, anti_patterns_detected, and all role details.${(isMultiSegment || hasVariants) ? ` This organization has ${intake._plan_count || combos.length} distinct comp plans to generate (${isMultiSegment ? 'multi-segment' : ''}${isMultiSegment && hasVariants ? ' + ' : ''}${hasVariants ? 'role variants' : ''}). Generate a separate role object for EACH combination.` : ''} This output replaces a $15-50K consulting engagement and must demonstrate that level of depth and rigor.`
}

/**
 * Build just the intake context block (company data, ops, baseline, etc.)
 * without any task-specific instructions. Used by pipeline stages that
 * append their own instructions.
 */
export function buildIntakeContext(intake) {
  // Call the full builder to trigger all the label/conditional logic
  buildUserPrompt(intake)
  // Return the cached context
  return buildUserPrompt._lastIntakeContext || ''
}

/**
 * Get pipeline metadata about the intake (multi-segment, variant info, etc.)
 */
export function getIntakeMetadata(intake) {
  // Ensure the builder has run
  buildUserPrompt(intake)
  return {
    isMultiSegment: buildUserPrompt._lastIsMultiSegment || false,
    hasVariants: buildUserPrompt._lastHasVariants || false,
    planCount: buildUserPrompt._lastPlanCount || 1,
  }
}
