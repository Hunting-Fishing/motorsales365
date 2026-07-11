import { useMemo } from 'react';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { calculateTax } from '@/utils/taxCalculations';

interface FleetTaxSettings {
  isFleetTaxExempt: boolean;
  fleetTaxExemptionId?: string;
  bulkTaxDiscount?: number;
}

interface UseFleetTaxCalculationsProps {
  laborAmount: number;
  partsAmount: number;
  fleetSettings?: FleetTaxSettings;
  shopId?: string;
}

/**
 * Hook for calculating taxes specific to fleet customers
 * Handles bulk discounts and fleet-level tax exemptions
 */
export function useFleetTaxCalculations({
  laborAmount,
  partsAmount,
  fleetSettings,
  shopId
}: UseFleetTaxCalculationsProps) {
  const { taxSettings, loading: taxSettingsLoading } = useTaxSettings(shopId);

  const calculations = useMemo(() => {
    if (!taxSettings || taxSettingsLoading) {
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
          taxDescription: 'Loading...'
        },
        isLoading: true,
        fleetDiscount: 0
      };
    }

    // Check if fleet is tax exempt
    const isFleetTaxExempt = fleetSettings?.isFleetTaxExempt || false;
    const fleetTaxExemptionId = fleetSettings?.fleetTaxExemptionId;

    // Calculate base taxes
    const baseTaxCalculation = calculateTax({
      laborAmount,
      partsAmount,
      taxSettings,
      isCustomerTaxExempt: isFleetTaxExempt,
      customerTaxExemptionId: fleetTaxExemptionId
    });

    // Apply fleet bulk discount if applicable
    const bulkDiscount = fleetSettings?.bulkTaxDiscount || 0;
    const discountMultiplier = 1 - (bulkDiscount / 100);

    const adjustedLaborTax = baseTaxCalculation.laborTax * discountMultiplier;
    const adjustedPartsTax = baseTaxCalculation.partsTax * discountMultiplier;
    const adjustedTotalTax = adjustedLaborTax + adjustedPartsTax;

    const fleetDiscountAmount = baseTaxCalculation.totalTax - adjustedTotalTax;

    return {
      laborTax: adjustedLaborTax,
      partsTax: adjustedPartsTax,
      totalTax: adjustedTotalTax,
      laborTotal: laborAmount + adjustedLaborTax,
      partsTotal: partsAmount + adjustedPartsTax,
      grandTotal: laborAmount + partsAmount + adjustedTotalTax,
      taxBreakdown: {
        ...baseTaxCalculation.taxBreakdown,
        taxDescription: bulkDiscount > 0 
          ? `${baseTaxCalculation.taxBreakdown.taxDescription} (Fleet Discount: ${bulkDiscount}%)`
          : baseTaxCalculation.taxBreakdown.taxDescription
      },
      isLoading: false,
      fleetDiscount: fleetDiscountAmount,
      bulkDiscountPercent: bulkDiscount
    };
  }, [laborAmount, partsAmount, fleetSettings, taxSettings, taxSettingsLoading]);

  return calculations;
}