import { useMemo } from 'react';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { calculateTax } from '@/utils/taxCalculations';
import { Quote, QuoteItem } from '@/types/quote';
import { Customer } from '@/types/customer';

interface UseQuoteTaxCalculationsProps {
  quote?: Quote | null;
  items?: QuoteItem[];
  customer?: Customer | null;
  shopId?: string;
}

export function useQuoteTaxCalculations({
  quote,
  items,
  customer,
  shopId
}: UseQuoteTaxCalculationsProps) {
  const { taxSettings, loading: taxSettingsLoading } = useTaxSettings(shopId);

  const calculations = useMemo(() => {
    // If no quote or items, return zero values
    if ((!quote && !items) || taxSettingsLoading || !taxSettings) {
      return {
        subtotal: 0,
        laborTax: 0,
        partsTax: 0,
        totalTax: 0,
        laborTotal: 0,
        partsTotal: 0,
        grandTotal: 0,
        taxBreakdown: {
          laborTaxRate: 0,
          partsTaxRate: 0,
          taxDescription: 'Loading...'
        },
        isLoading: taxSettingsLoading
      };
    }

    // Calculate subtotal from quote items or quote subtotal
    let subtotal = 0;
    let laborAmount = 0;
    let partsAmount = 0;

    if (items && items.length > 0) {
      // Calculate from items
      subtotal = items.reduce((sum, item) => {
        return sum + (item.unit_price || 0) * (item.quantity || 0);
      }, 0);

      // Categorize items as labor vs parts
      items.forEach(item => {
        const itemTotal = (item.unit_price || 0) * (item.quantity || 0);
        if (item.item_type === 'labor') {
          laborAmount += itemTotal;
        } else {
          partsAmount += itemTotal;
        }
      });
    } else if (quote) {
      // Use quote subtotal and estimate labor/parts split
      subtotal = quote.subtotal || 0;
      laborAmount = subtotal * 0.6; // Assume 60% labor
      partsAmount = subtotal * 0.4; // Assume 40% parts
    }

    // Determine if customer is tax exempt
    const isCustomerTaxExempt = customer?.labor_tax_exempt || customer?.parts_tax_exempt || false;
    const customerTaxExemptionId = customer?.tax_exempt_certificate_number;

    // Calculate taxes using the tax calculation utility
    const taxCalculation = calculateTax({
      laborAmount,
      partsAmount,
      taxSettings,
      isCustomerTaxExempt,
      customerTaxExemptionId
    });

    return {
      subtotal,
      laborTax: taxCalculation.laborTax,
      partsTax: taxCalculation.partsTax,
      totalTax: taxCalculation.totalTax,
      laborTotal: taxCalculation.laborTotal,
      partsTotal: taxCalculation.partsTotal,
      grandTotal: taxCalculation.grandTotal,
      taxBreakdown: taxCalculation.taxBreakdown,
      isCustomerTaxExempt,
      customerTaxExemptionId,
      isLoading: false
    };
  }, [quote, items, customer, taxSettings, taxSettingsLoading]);

  return calculations;
}