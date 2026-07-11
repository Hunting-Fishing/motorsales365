import { useMemo } from 'react';
import { useTaxSettings } from './useTaxSettings';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Customer } from '@/types/customer';
import { calculateTax, TaxCalculationResult } from '@/utils/taxCalculations';

interface UseWorkOrderTaxCalculationsProps {
  jobLines: WorkOrderJobLine[];
  parts: WorkOrderPart[];
  customer?: Customer | null;
}

export function useWorkOrderTaxCalculations({ 
  jobLines, 
  parts, 
  customer 
}: UseWorkOrderTaxCalculationsProps) {
  const { taxSettings, loading: taxSettingsLoading } = useTaxSettings();

  const calculations = useMemo(() => {
    if (!taxSettings || taxSettingsLoading) {
      // Return default calculations while loading
      const laborAmount = jobLines.reduce((sum, line) => sum + (line.total_amount || 0), 0);
      const partsAmount = parts.reduce((sum, part) => sum + part.total_price, 0);
      const subtotal = laborAmount + partsAmount;
      
      return {
        laborAmount,
        partsAmount,
        subtotal,
        laborTax: 0,
        partsTax: 0,
        totalTax: 0,
        grandTotal: subtotal,
        isLoading: true,
        taxBreakdown: {
          laborTaxRate: 0,
          partsTaxRate: 0,
          taxDescription: 'Loading...'
        }
      };
    }

    // Calculate base amounts
    const laborAmount = jobLines.reduce((sum, line) => sum + (line.total_amount || 0), 0);
    const partsAmount = parts.reduce((sum, part) => part.total_price, 0);

    // Determine if customer is tax exempt
    const isCustomerTaxExempt = customer?.labor_tax_exempt || customer?.parts_tax_exempt || false;
    const customerTaxExemptionId = customer?.tax_exempt_certificate_number;

    // Calculate taxes using the tax calculation utility
    const taxCalculation: TaxCalculationResult = calculateTax({
      laborAmount,
      partsAmount,
      taxSettings,
      isCustomerTaxExempt,
      customerTaxExemptionId
    });

    return {
      laborAmount,
      partsAmount,
      subtotal: laborAmount + partsAmount,
      laborTax: taxCalculation.laborTax,
      partsTax: taxCalculation.partsTax,
      totalTax: taxCalculation.totalTax,
      laborTotal: taxCalculation.laborTotal,
      partsTotal: taxCalculation.partsTotal,
      grandTotal: taxCalculation.grandTotal,
      isLoading: false,
      taxBreakdown: taxCalculation.taxBreakdown,
      isCustomerTaxExempt,
      customerTaxExemptionId
    };
  }, [jobLines, parts, customer, taxSettings, taxSettingsLoading]);

  return calculations;
}