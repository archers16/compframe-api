// Validation Module -- ensures numerical consistency across the pipeline
//
// Layer 1: Validate the numerical contract itself (internal math)
// Layer 2: Validate group outputs reference contract values correctly
// Layer 3: Check for common LLM formatting errors

/**
 * Validate the numerical contract for internal consistency.
 * Returns { valid: boolean, errors: [], warnings: [] }
 */
export function validateContract(contract) {
  const errors = []
  const warnings = []

  if (!contract?.roles?.length) {
    errors.push({ field: 'roles', message: 'Numerical contract has no roles', severity: 'critical' })
    return { valid: false, errors, warnings }
  }

  let calculatedTotalOTE = 0
  let calculatedTotalBase = 0
  let calculatedTotalVariable = 0

  for (const role of contract.roles) {
    const prefix = `Role "${role.role_name || role.role_key}"`

    // OTE = base + variable
    if (role.ote && role.base_salary && role.target_variable) {
      const sum = role.base_salary + role.target_variable
      if (Math.abs(sum - role.ote) > 1) {
        errors.push({
          field: `${role.role_key}.ote`,
          message: `${prefix}: base_salary ($${role.base_salary}) + target_variable ($${role.target_variable}) = $${sum}, but OTE is $${role.ote}`,
          severity: 'critical',
          fix: { base_salary: Math.round(role.ote * role.base_pct / 100), target_variable: Math.round(role.ote * role.variable_pct / 100) }
        })
      }
    }

    // Pay mix sums to 100
    if (role.base_pct != null && role.variable_pct != null) {
      const mixSum = role.base_pct + role.variable_pct
      if (Math.abs(mixSum - 100) > 0.5) {
        errors.push({
          field: `${role.role_key}.pay_mix`,
          message: `${prefix}: base_pct (${role.base_pct}) + variable_pct (${role.variable_pct}) = ${mixSum}, should be 100`,
          severity: 'critical'
        })
      }
    }

    // Measure weights sum to 100
    if (role.measures?.length > 0) {
      const weightSum = role.measures.reduce((sum, m) => sum + (m.weight_pct || 0), 0)
      if (Math.abs(weightSum - 100) > 1) {
        errors.push({
          field: `${role.role_key}.measures`,
          message: `${prefix}: measure weights sum to ${weightSum}, should be 100`,
          severity: 'critical'
        })
      }
    }

    // Earnings at 100% = OTE
    if (role.earnings_at_100pct && role.ote) {
      if (Math.abs(role.earnings_at_100pct - role.ote) > 1) {
        errors.push({
          field: `${role.role_key}.earnings_at_100pct`,
          message: `${prefix}: earnings_at_100pct ($${role.earnings_at_100pct}) should equal OTE ($${role.ote})`,
          severity: 'critical',
          fix: { earnings_at_100pct: role.ote }
        })
      }
    }

    // Earnings at 80% should be less than OTE
    if (role.earnings_at_80pct && role.ote && role.earnings_at_80pct >= role.ote) {
      warnings.push({
        field: `${role.role_key}.earnings_at_80pct`,
        message: `${prefix}: earnings at 80% ($${role.earnings_at_80pct}) should be less than OTE ($${role.ote})`,
        severity: 'warning'
      })
    }

    // Earnings progression should be monotonic
    if (role.earnings_at_80pct && role.earnings_at_100pct && role.earnings_at_120pct && role.earnings_at_150pct) {
      if (role.earnings_at_80pct > role.earnings_at_100pct ||
          role.earnings_at_100pct > role.earnings_at_120pct ||
          role.earnings_at_120pct > role.earnings_at_150pct) {
        warnings.push({
          field: `${role.role_key}.earnings`,
          message: `${prefix}: earnings progression is not monotonically increasing`,
          severity: 'warning'
        })
      }
    }

    // Quota:variable multiple check
    if (role.annual_quota && role.target_variable && role.target_variable > 0) {
      const multiple = role.annual_quota / role.target_variable
      if (multiple < 3 || multiple > 7) {
        warnings.push({
          field: `${role.role_key}.quota_multiple`,
          message: `${prefix}: quota:variable multiple is ${multiple.toFixed(1)}x (typical range: 3.5-5x)`,
          severity: 'warning'
        })
      }
    }

    // SDR OTE floor
    if (role.base_role === 'sdr' && role.ote && role.ote < 70000) {
      errors.push({
        field: `${role.role_key}.ote`,
        message: `${prefix}: SDR OTE ($${role.ote}) is below $70K minimum floor`,
        severity: 'critical',
        fix: { ote: 70000 }
      })
    }

    // Headcount must be positive
    if (role.headcount != null && role.headcount <= 0) {
      warnings.push({
        field: `${role.role_key}.headcount`,
        message: `${prefix}: headcount is ${role.headcount}, should be positive`,
        severity: 'warning'
      })
    }

    // Accumulate totals
    const hc = role.headcount || 1
    calculatedTotalOTE += (role.ote || 0) * hc
    calculatedTotalBase += (role.base_salary || 0) * hc
    calculatedTotalVariable += (role.target_variable || 0) * hc
  }

  // Validate company-level totals
  if (contract.company_level) {
    const cl = contract.company_level

    if (cl.total_ote_at_target && Math.abs(cl.total_ote_at_target - calculatedTotalOTE) > 100) {
      errors.push({
        field: 'company_level.total_ote_at_target',
        message: `Company total OTE ($${cl.total_ote_at_target}) doesn't match sum of role OTEs ($${calculatedTotalOTE})`,
        severity: 'critical',
        fix: { total_ote_at_target: calculatedTotalOTE }
      })
    }

    if (cl.total_base_salary && Math.abs(cl.total_base_salary - calculatedTotalBase) > 100) {
      errors.push({
        field: 'company_level.total_base_salary',
        message: `Company total base ($${cl.total_base_salary}) doesn't match sum of role bases ($${calculatedTotalBase})`,
        severity: 'critical',
        fix: { total_base_salary: calculatedTotalBase }
      })
    }
  }

  return {
    valid: errors.filter(e => e.severity === 'critical').length === 0,
    errors,
    warnings
  }
}

/**
 * Auto-fix critical errors in the numerical contract.
 * Applies safe, deterministic fixes (math corrections only).
 * Returns the fixed contract.
 */
export function autoFixContract(contract) {
  const fixed = JSON.parse(JSON.stringify(contract)) // deep clone

  for (const role of fixed.roles) {
    // Fix OTE = base + variable
    if (role.ote && role.base_pct != null) {
      role.base_salary = Math.round(role.ote * role.base_pct / 100)
      role.target_variable = role.ote - role.base_salary // ensures exact sum
    }

    // Fix earnings at 100%
    if (role.ote) {
      role.earnings_at_100pct = role.ote
    }

    // Fix SDR floor
    if (role.base_role === 'sdr' && role.ote && role.ote < 70000) {
      role.ote = 70000
      role.base_salary = Math.round(70000 * role.base_pct / 100)
      role.target_variable = 70000 - role.base_salary
      role.earnings_at_100pct = 70000
    }
  }

  // Recalculate company-level totals
  let totalOTE = 0, totalBase = 0, totalVariable = 0
  for (const role of fixed.roles) {
    const hc = role.headcount || 1
    totalOTE += (role.ote || 0) * hc
    totalBase += (role.base_salary || 0) * hc
    totalVariable += (role.target_variable || 0) * hc
  }

  if (fixed.company_level) {
    fixed.company_level.total_ote_at_target = totalOTE
    fixed.company_level.total_base_salary = totalBase
    fixed.company_level.total_variable_at_target = totalVariable

    // Recalculate attainment scenarios
    // At 80%: base stays fixed, variable = 80% of target
    fixed.company_level.total_cost_80pct = totalBase + Math.round(totalVariable * 0.8)
    // At 120%: need to account for accelerators, but as a rough estimate
    // use 120% * variable (actual will depend on tier structure)
    if (!fixed.company_level.total_cost_120pct) {
      fixed.company_level.total_cost_120pct = totalBase + Math.round(totalVariable * 1.3) // ~1.25x accel average
    }
    if (!fixed.company_level.total_cost_150pct) {
      fixed.company_level.total_cost_150pct = totalBase + Math.round(totalVariable * 1.8) // ~1.5x accel average
    }

    fixed.company_level.total_headcount = fixed.roles.reduce((sum, r) => sum + (r.headcount || 1), 0)
  }

  return fixed
}

/**
 * Validate a group output against the numerical contract.
 * Checks that key numerical values match the contract.
 * Returns { valid: boolean, errors: [] }
 */
export function validateGroupOutput(groupId, groupOutput, contract) {
  const errors = []

  if (!groupOutput || typeof groupOutput !== 'object') {
    errors.push({ group: groupId, message: 'Group output is null or not an object', severity: 'critical' })
    return { valid: false, errors }
  }

  // Group A specific: validate roles match contract
  if (groupId === 'A' && groupOutput.roles) {
    for (const [roleKey, roleData] of Object.entries(groupOutput.roles)) {
      const contractRole = contract.roles.find(r => r.role_key === roleKey)
      if (!contractRole) {
        errors.push({
          group: 'A',
          message: `Role "${roleKey}" in output not found in numerical contract`,
          severity: 'warning'
        })
        continue
      }

      // Check OTE matches
      if (roleData.ote?.recommended && contractRole.ote) {
        if (Math.abs(roleData.ote.recommended - contractRole.ote) > 1) {
          errors.push({
            group: 'A',
            role: roleKey,
            field: 'ote.recommended',
            expected: contractRole.ote,
            actual: roleData.ote.recommended,
            severity: 'critical'
          })
        }
      }

      // Check pay mix matches
      if (roleData.pay_mix?.base_pct != null && contractRole.base_pct != null) {
        if (Math.abs(roleData.pay_mix.base_pct - contractRole.base_pct) > 1) {
          errors.push({
            group: 'A',
            role: roleKey,
            field: 'pay_mix.base_pct',
            expected: contractRole.base_pct,
            actual: roleData.pay_mix.base_pct,
            severity: 'critical'
          })
        }
      }
    }

    // Check all contract roles are present in output
    for (const contractRole of contract.roles) {
      if (!groupOutput.roles[contractRole.role_key]) {
        errors.push({
          group: 'A',
          message: `Contract role "${contractRole.role_key}" missing from Group A output`,
          severity: 'critical'
        })
      }
    }

    // Check cost model numbers
    if (groupOutput.cost_model && contract.company_level) {
      const cm = groupOutput.cost_model
      const cl = contract.company_level
      if (cm.total_ote_at_target && cl.total_ote_at_target) {
        if (Math.abs(cm.total_ote_at_target - cl.total_ote_at_target) > 100) {
          errors.push({
            group: 'A',
            field: 'cost_model.total_ote_at_target',
            expected: cl.total_ote_at_target,
            actual: cm.total_ote_at_target,
            severity: 'critical'
          })
        }
      }
    }
  }

  // Group E specific: validate slide earnings match contract
  if (groupId === 'E' && groupOutput.slide_content?.appendix_attainment) {
    for (const entry of groupOutput.slide_content.appendix_attainment) {
      // Just check that the role exists in contract
      const contractRole = contract.roles.find(r => r.role_name === entry.role || r.role_key === entry.role)
      if (!contractRole) {
        errors.push({
          group: 'E',
          message: `Slide attainment role "${entry.role}" not found in contract`,
          severity: 'warning'
        })
      }
    }
  }

  return {
    valid: errors.filter(e => e.severity === 'critical').length === 0,
    errors
  }
}

/**
 * Force-fix a Group A output to match the numerical contract.
 * Overwrites key numerical fields with contract values.
 */
export function forceAlignGroupA(groupOutput, contract) {
  if (!groupOutput?.roles || !contract?.roles) return groupOutput

  const fixed = JSON.parse(JSON.stringify(groupOutput))

  for (const contractRole of contract.roles) {
    const key = contractRole.role_key
    if (!fixed.roles[key]) continue

    const role = fixed.roles[key]

    // Force OTE
    if (role.ote) {
      role.ote.recommended = contractRole.ote
      role.ote.range_low = contractRole.ote_range_low
      role.ote.range_high = contractRole.ote_range_high
    }

    // Force pay mix
    if (role.pay_mix) {
      role.pay_mix.base_pct = contractRole.base_pct
      role.pay_mix.variable_pct = contractRole.variable_pct
    }

    // Force role name
    role.role_name = contractRole.role_name

    // Force payout frequency
    role.payout_frequency = contractRole.payout_frequency
  }

  // Force cost model
  if (fixed.cost_model && contract.company_level) {
    fixed.cost_model.total_ote_at_target = contract.company_level.total_ote_at_target
    fixed.cost_model.total_cost_80pct = contract.company_level.total_cost_80pct
    fixed.cost_model.total_cost_120pct = contract.company_level.total_cost_120pct
    fixed.cost_model.total_cost_150pct = contract.company_level.total_cost_150pct
    fixed.cost_model.base_salary_total = contract.company_level.total_base_salary
    fixed.cost_model.variable_at_target_total = contract.company_level.total_variable_at_target
  }

  return fixed
}
