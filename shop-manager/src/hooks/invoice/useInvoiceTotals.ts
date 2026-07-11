
import { useMemo } from 'react';
import { InvoiceItem } from '@/types/invoice';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { Customer } from '@/types/customer';
import { calculateTax } from '@/utils/taxCalculations';

interface UseInvoiceTotalsProps {
  items?: InvoiceItem[];
  customer?: Customer | null;
}

// Overloaded function signatures for backward compatibility
export function useInvoiceTotals(items: InvoiceItem[]): any;
export function useInvoiceTotals(props: UseInvoiceTotalsProps): any;
export function useInvoiceTotals(itemsOrProps: InvoiceItem[] | UseInvoiceTotalsProps) {
  // Determine if called with old signature (array) or new signature (object)
  const isOldSignature = Array.isArray(itemsOrProps);
  const items = isOldSignature ? itemsOrProps : itemsOrProps.items || [];
  const customer = isOldSignature ? null : itemsOrProps.customer;
  const { taxSettings, loading: taxSettingsLoading } = useTaxSettings();

  const calculations = useMemo(() => {
    // Calculate totals by category from invoice items
    let laborAmount = 0;
    let partsAmount = 0;
    let uncategorizedAmount = 0;

    items.forEach(item => {
      const itemTotal = (item.price || 0) * (item.quantity || 0);
      const category = (item.category || '').toLowerCase();
      
      // Categorize items based on category field or hours flag
      if (category === 'labor' || category === 'service' || item.hours) {
        laborAmount += itemTotal;
      } else if (category === 'parts' || category === 'part' || category === 'product' || category === 'inventory') {
        partsAmount += itemTotal;
      } else {
        // For uncategorized items, check name patterns as fallback
        const name = (item.name || '').toLowerCase();
        if (name.includes('labor') || name.includes('service') || name.includes('diagnostic') || name.includes('hour')) {
          laborAmount += itemTotal;
        } else if (name.includes('part') || name.includes('fluid') || name.includes('filter') || name.includes('oil')) {
          partsAmount += itemTotal;
        } else {
          uncategorizedAmount += itemTotal;
        }
      }
    });

    // Split uncategorized items 50/50 between labor and parts as fallback
    if (uncategorizedAmount > 0) {
      laborAmount += uncategorizedAmount * 0.5;
      partsAmount += uncategorizedAmount * 0.5;
    }

    const calculatedSubtotal = laborAmount + partsAmount;

    if (!taxSettings || taxSettingsLoading) {
      return {
        subtotal: calculatedSubtotal,
        tax: 0,
        taxRate: 0,
        total: calculatedSubtotal,
        isLoading: true,
        laborTax: 0,
        partsTax: 0,
        totalTax: 0,
        laborSubtotal: laborAmount,
        partsSubtotal: partsAmount,
        taxBreakdown: {
          laborTaxRate: 0,
          partsTaxRate: 0,
          taxDescription: 'Loading...'
        }
      };
    }

    // Determine if customer is tax exempt (check specific exemptions)
    const isLaborTaxExempt = customer?.labor_tax_exempt || false;
    const isPartsTaxExempt = customer?.parts_tax_exempt || false;
    const isCustomerTaxExempt = isLaborTaxExempt && isPartsTaxExempt;
    const customerTaxExemptionId = customer?.tax_exempt_certificate_number;

    // Calculate taxes using the tax calculation utility with actual category amounts
    const taxCalculation = calculateTax({
      laborAmount: isLaborTaxExempt ? 0 : laborAmount,
      partsAmount: isPartsTaxExempt ? 0 : partsAmount,
      taxSettings,
      isCustomerTaxExempt,
      customerTaxExemptionId
    });

    // Legacy compatibility - calculate effective average tax rate
    const averageTaxRate = calculatedSubtotal > 0 
      ? (taxCalculation.totalTax / calculatedSubtotal) * 100 
      : 0;

    return {
      subtotal: calculatedSubtotal,
      tax: taxCalculation.totalTax,
      taxRate: averageTaxRate,
      total: calculatedSubtotal + taxCalculation.totalTax,
      isLoading: false,
      laborTax: taxCalculation.laborTax,
      partsTax: taxCalculation.partsTax,
      totalTax: taxCalculation.totalTax,
      laborSubtotal: laborAmount,
      partsSubtotal: partsAmount,
      taxBreakdown: taxCalculation.taxBreakdown,
      isCustomerTaxExempt,
      isLaborTaxExempt,
      isPartsTaxExempt,
      customerTaxExemptionId
    };
  }, [items, customer, taxSettings, taxSettingsLoading]);

  return calculations;
};
