import { TaxSettings } from '@/services/settings/taxSettingsService';

export interface TaxValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates tax settings for consistency and compliance
 */
export function validateTaxSettings(settings: TaxSettings): TaxValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (settings.labor_tax_rate < 0 || settings.labor_tax_rate > 100) {
    errors.push('Labor tax rate must be between 0% and 100%');
  }

  if (settings.parts_tax_rate < 0 || settings.parts_tax_rate > 100) {
    errors.push('Parts tax rate must be between 0% and 100%');
  }

  // Compliance warnings
  if (settings.labor_tax_rate > 15) {
    warnings.push('Labor tax rate above 15% may indicate an error');
  }

  if (settings.parts_tax_rate > 15) {
    warnings.push('Parts tax rate above 15% may indicate an error');
  }

  // Configuration warnings
  if (!settings.apply_tax_to_labor && !settings.apply_tax_to_parts) {
    warnings.push('No tax is being applied to labor or parts');
  }

  if (settings.labor_tax_rate !== settings.parts_tax_rate && settings.tax_calculation_method === 'compound') {
    warnings.push('Different tax rates with compound calculation may produce unexpected results');
  }

  // Tax description validation
  if (!settings.tax_description || settings.tax_description.trim().length === 0) {
    errors.push('Tax description is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Creates audit trail entry for tax calculation
 */
export function createTaxAuditEntry(
  entityType: 'quote' | 'invoice' | 'work_order',
  entityId: string,
  taxCalculation: any,
  userId?: string
) {
  return {
    entity_type: entityType,
    entity_id: entityId,
    tax_calculation: taxCalculation,
    calculated_at: new Date().toISOString(),
    calculated_by: userId,
    tax_settings_snapshot: taxCalculation.taxBreakdown
  };
}

/**
 * Validates customer tax exemption
 */
export function validateTaxExemption(
  exemptionId?: string,
  exemptCustomers: string[] = []
): boolean {
  if (!exemptionId) return false;
  return exemptCustomers.includes(exemptionId);
}