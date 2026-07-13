import { useMemo } from 'react';
import { InsurancePolicy, InsurancePremiumTrend, InsuranceByType } from '@/types/insurance';
import { format, parseISO, startOfMonth, eachMonthOfInterval, subMonths, addMonths } from 'date-fns';

export function useInsuranceAnalytics(policies: InsurancePolicy[]) {
  // Premium trends over the last 12 months
  const premiumTrends = useMemo((): InsurancePremiumTrend[] => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 11),
      end: startOfMonth(now),
    });

    return months.map(month => {
      const monthStr = format(month, 'yyyy-MM');
      const activePolicies = policies.filter(p => {
        const effective = parseISO(p.effective_date);
        const expiration = parseISO(p.expiration_date);
        return effective <= month && expiration >= month;
      });

      const monthlyPremium = activePolicies.reduce((sum, p) => {
        const annual = Number(p.premium_amount) || 0;
        // Convert to monthly based on frequency
        switch (p.payment_frequency) {
          case 'monthly': return sum + annual;
          case 'quarterly': return sum + (annual / 3);
          case 'semi-annual': return sum + (annual / 6);
          case 'annual': return sum + (annual / 12);
          default: return sum + (annual / 12);
        }
      }, 0);

      return {
        month: format(month, 'MMM yyyy'),
        premium: Math.round(monthlyPremium * 100) / 100,
        count: activePolicies.length,
      };
    });
  }, [policies]);

  // Insurance by type breakdown
  const insuranceByType = useMemo((): InsuranceByType[] => {
    const typeMap = new Map<string, { count: number; totalPremium: number }>();

    policies.forEach(p => {
      const type = p.insurance_type;
      const existing = typeMap.get(type) || { count: 0, totalPremium: 0 };
      typeMap.set(type, {
        count: existing.count + 1,
        totalPremium: existing.totalPremium + Number(p.premium_amount || 0),
      });
    });

    return Array.from(typeMap.entries()).map(([type, data]) => ({
      type: type as any,
      count: data.count,
      totalPremium: data.totalPremium,
    }));
  }, [policies]);

  // Provider breakdown
  const insuranceByProvider = useMemo(() => {
    const providerMap = new Map<string, { count: number; totalPremium: number }>();

    policies.forEach(p => {
      const provider = p.insurance_provider;
      const existing = providerMap.get(provider) || { count: 0, totalPremium: 0 };
      providerMap.set(provider, {
        count: existing.count + 1,
        totalPremium: existing.totalPremium + Number(p.premium_amount || 0),
      });
    });

    return Array.from(providerMap.entries())
      .map(([provider, data]) => ({
        provider,
        count: data.count,
        totalPremium: data.totalPremium,
      }))
      .sort((a, b) => b.totalPremium - a.totalPremium);
  }, [policies]);

  // Forecast next 12 months premiums
  const premiumForecast = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: addMonths(startOfMonth(now), 1),
      end: addMonths(startOfMonth(now), 12),
    });

    return months.map(month => {
      const activePolicies = policies.filter(p => {
        const effective = parseISO(p.effective_date);
        const expiration = parseISO(p.expiration_date);
        // Include renewals (assume auto-renew policies continue)
        if (p.auto_renew && expiration < month) {
          return true;
        }
        return effective <= month && expiration >= month;
      });

      const monthlyPremium = activePolicies.reduce((sum, p) => {
        const annual = Number(p.premium_amount) || 0;
        switch (p.payment_frequency) {
          case 'monthly': return sum + annual;
          case 'quarterly': return sum + (annual / 3);
          case 'semi-annual': return sum + (annual / 6);
          case 'annual': return sum + (annual / 12);
          default: return sum + (annual / 12);
        }
      }, 0);

      return {
        month: format(month, 'MMM yyyy'),
        premium: Math.round(monthlyPremium * 100) / 100,
        count: activePolicies.length,
      };
    });
  }, [policies]);

  // Annual premium calculation
  const annualPremiumTotal = useMemo(() => {
    return policies
      .filter(p => p.status === 'active')
      .reduce((sum, p) => {
        const premium = Number(p.premium_amount) || 0;
        switch (p.payment_frequency) {
          case 'monthly': return sum + (premium * 12);
          case 'quarterly': return sum + (premium * 4);
          case 'semi-annual': return sum + (premium * 2);
          case 'annual': return sum + premium;
          default: return sum + premium;
        }
      }, 0);
  }, [policies]);

  // Average premium per policy
  const averagePremium = useMemo(() => {
    const activePolicies = policies.filter(p => p.status === 'active');
    if (activePolicies.length === 0) return 0;
    return annualPremiumTotal / activePolicies.length;
  }, [policies, annualPremiumTotal]);

  // Coverage gaps - assets without insurance
  const coverageGaps = useMemo(() => {
    const insuredEquipmentIds = new Set(policies.map(p => p.equipment_id).filter(Boolean));
    const insuredVehicleIds = new Set(policies.map(p => p.vehicle_id).filter(Boolean));
    
    return {
      equipmentWithoutInsurance: insuredEquipmentIds.size,
      vehiclesWithoutInsurance: insuredVehicleIds.size,
    };
  }, [policies]);

  return {
    premiumTrends,
    insuranceByType,
    insuranceByProvider,
    premiumForecast,
    annualPremiumTotal,
    averagePremium,
    coverageGaps,
  };
}
