import { TaxSettings } from '@/services/settings/taxSettingsService';

export interface TaxCalculationInput {
  laborAmount: number;
  partsAmount: number;
  taxSettings: TaxSettings;
  isCustomerTaxExempt?: boolean;
  customerTaxExemptionId?: string;
}

export interface TaxCalculationResult {
  laborTax: number;
  partsTax: number;
  totalTax: number;
  laborTotal: number;
  partsTotal: number;
  grandTotal: number;
  taxBreakdown: {
    laborTaxRate: number;
    partsTaxRate: number;
    taxDescription: string;
  };
}

/**
 * Calculate tax amounts for labor and parts based on company tax settings
 */
export function calculateTax({
  laborAmount,
  partsAmount,
  taxSettings,
  isCustomerTaxExempt = false,
  customerTaxExemptionId
}: TaxCalculationInput): TaxCalculationResult {
  // If customer is tax exempt, return zero tax
  if (isCustomerTaxExempt || 
      (customerTaxExemptionId && taxSettings.tax_exempt_customers.includes(customerTaxExemptionId))) {
    return {
      laborTax: 0,
      partsTax: 0,
      totalTax: 0,
      laborTotal: laborAmount,
      partsTotal: partsAmount,
      grandTotal: laborAmount + partsAmount,
      taxBreakdown: {
        laborTaxRate: 0,
        partsTaxRate: 0,
        taxDescription: taxSettings.tax_description + ' (Exempt)'
      }
    };
  }

  // Calculate tax amounts based on settings
  const laborTaxRate = taxSettings.apply_tax_to_labor ? taxSettings.labor_tax_rate / 100 : 0;
  const partsTaxRate = taxSettings.apply_tax_to_parts ? taxSettings.parts_tax_rate / 100 : 0;

  let laborTax = 0;
  let partsTax = 0;

  if (taxSettings.tax_calculation_method === 'separate') {
    // Calculate tax separately for labor and parts
    laborTax = laborAmount * laborTaxRate;
    partsTax = partsAmount * partsTaxRate;
  } else {
    // Compound method - apply tax to combined total
    const subtotal = laborAmount + partsAmount;
    const averageRate = ((laborAmount * laborTaxRate) + (partsAmount * partsTaxRate)) / subtotal;
    const totalTax = subtotal * averageRate;
    
    // Distribute tax proportionally
    laborTax = totalTax * (laborAmount / subtotal);
    partsTax = totalTax * (partsAmount / subtotal);
  }

  // Calculate totals based on display method
  let laborTotal: number;
  let partsTotal: number;

  if (taxSettings.tax_display_method === 'inclusive') {
    // Tax is included in the displayed amounts
    laborTotal = laborAmount;
    partsTotal = partsAmount;
    // Recalculate tax from inclusive amounts
    laborTax = laborAmount - (laborAmount / (1 + laborTaxRate));
    partsTax = partsAmount - (partsAmount / (1 + partsTaxRate));
  } else {
    // Tax is added to the amounts
    laborTotal = laborAmount + laborTax;
    partsTotal = partsAmount + partsTax;
  }

  const totalTax = laborTax + partsTax;
  const grandTotal = laborTotal + partsTotal;

  return {
    laborTax: Math.round(laborTax * 100) / 100,
    partsTax: Math.round(partsTax * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    laborTotal: Math.round(laborTotal * 100) / 100,
    partsTotal: Math.round(partsTotal * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    taxBreakdown: {
      laborTaxRate: taxSettings.labor_tax_rate,
      partsTaxRate: taxSettings.parts_tax_rate,
      taxDescription: taxSettings.tax_description
    }
  };
}

/**
 * Format tax rate for display
 */
export function formatTaxRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Get tax summary text for invoices/estimates
 */
export function getTaxSummaryText(calculation: TaxCalculationResult): string {
  const { taxBreakdown } = calculation;
  
  if (calculation.totalTax === 0) {
    return `${taxBreakdown.taxDescription}: $0.00`;
  }
  
  if (taxBreakdown.laborTaxRate === taxBreakdown.partsTaxRate) {
    return `${taxBreakdown.taxDescription} (${formatTaxRate(taxBreakdown.laborTaxRate)}): ${formatCurrency(calculation.totalTax)}`;
  }
  
  return `${taxBreakdown.taxDescription}: ${formatCurrency(calculation.totalTax)} (Labor: ${formatTaxRate(taxBreakdown.laborTaxRate)}, Parts: ${formatTaxRate(taxBreakdown.partsTaxRate)})`;
}