import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';
import type { PricingFormula, ConditionLevel, QuoteCalculation } from '@/types/pricing-formula';

export interface FormulaChemical {
  id?: string;
  inventory_item_id: string | null;
  chemical_name: string;
  concentration_light: number;
  concentration_medium: number;
  concentration_heavy: number;
  coverage_sqft_per_gallon: number;
  is_primary: boolean;
  display_order: number;
  notes?: string;
}

export function usePricingFormulas() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  const formulasQuery = useQuery({
    queryKey: ['pricing-formulas', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('power_washing_pricing_formulas')
        .select('*')
        .eq('shop_id', shopId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as PricingFormula[];
    },
    enabled: !!shopId,
  });

  // Fetch chemicals for a specific formula
  const useFormulaChemicals = (formulaId: string | null) => {
    return useQuery({
      queryKey: ['formula-chemicals', formulaId],
      queryFn: async () => {
        if (!formulaId) return [];
        
        const { data, error } = await supabase
          .from('power_washing_formula_chemicals')
          .select('*')
          .eq('formula_id', formulaId)
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        return data as (FormulaChemical & { id: string; formula_id: string })[];
      },
      enabled: !!formulaId,
    });
  };

  const createFormula = useMutation({
    mutationFn: async ({ formula, chemicals }: { formula: Partial<PricingFormula>; chemicals?: FormulaChemical[] }) => {
      if (!shopId) throw new Error('No shop ID');
      
      const insertData = {
        name: formula.name || '',
        surface_type: formula.surface_type || 'concrete',
        application: formula.application || 'driveway',
        category: formula.category || 'residential',
        price_per_sqft_light: formula.price_per_sqft_light || 0.10,
        price_per_sqft_medium: formula.price_per_sqft_medium || 0.18,
        price_per_sqft_heavy: formula.price_per_sqft_heavy || 0.28,
        minimum_charge: formula.minimum_charge || 100,
        sh_concentration_light: formula.sh_concentration_light || 1.0,
        sh_concentration_medium: formula.sh_concentration_medium || 3.0,
        sh_concentration_heavy: formula.sh_concentration_heavy || 5.0,
        mix_coverage_sqft: formula.mix_coverage_sqft || 150,
        minutes_per_100sqft: formula.minutes_per_100sqft || 3,
        setup_minutes: formula.setup_minutes || 20,
        labor_rate_type: formula.labor_rate_type || 'standard',
        notes: formula.notes || null,
        is_active: formula.is_active ?? true,
        display_order: formula.display_order || 0,
        shop_id: shopId,
      };
      
      const { data: formulaData, error: formulaError } = await supabase
        .from('power_washing_pricing_formulas')
        .insert(insertData)
        .select()
        .single();
      
      if (formulaError) throw formulaError;

      // Insert chemicals if provided
      if (chemicals && chemicals.length > 0) {
        const chemicalsToInsert = chemicals.map((chem, index) => ({
          formula_id: formulaData.id,
          inventory_item_id: chem.inventory_item_id,
          chemical_name: chem.chemical_name,
          concentration_light: chem.concentration_light,
          concentration_medium: chem.concentration_medium,
          concentration_heavy: chem.concentration_heavy,
          coverage_sqft_per_gallon: chem.coverage_sqft_per_gallon,
          is_primary: chem.is_primary,
          display_order: index,
          notes: chem.notes || null,
        }));

        const { error: chemError } = await supabase
          .from('power_washing_formula_chemicals')
          .insert(chemicalsToInsert);

        if (chemError) throw chemError;
      }
      
      return formulaData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-formulas', shopId] });
      queryClient.invalidateQueries({ queryKey: ['formula-chemicals'] });
      toast.success('Pricing formula created');
    },
    onError: (error) => {
      toast.error('Failed to create formula: ' + error.message);
    },
  });

  const updateFormula = useMutation({
    mutationFn: async ({ id, chemicals, ...updates }: Partial<PricingFormula> & { id: string; chemicals?: FormulaChemical[] }) => {
      const { data, error } = await supabase
        .from('power_washing_pricing_formulas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Update chemicals if provided
      if (chemicals !== undefined) {
        // Delete existing chemicals
        await supabase
          .from('power_washing_formula_chemicals')
          .delete()
          .eq('formula_id', id);

        // Insert new chemicals
        if (chemicals.length > 0) {
          const chemicalsToInsert = chemicals.map((chem, index) => ({
            formula_id: id,
            inventory_item_id: chem.inventory_item_id,
            chemical_name: chem.chemical_name,
            concentration_light: chem.concentration_light,
            concentration_medium: chem.concentration_medium,
            concentration_heavy: chem.concentration_heavy,
            coverage_sqft_per_gallon: chem.coverage_sqft_per_gallon,
            is_primary: chem.is_primary,
            display_order: index,
            notes: chem.notes || null,
          }));

          const { error: chemError } = await supabase
            .from('power_washing_formula_chemicals')
            .insert(chemicalsToInsert);

          if (chemError) throw chemError;
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-formulas', shopId] });
      queryClient.invalidateQueries({ queryKey: ['formula-chemicals'] });
      toast.success('Pricing formula updated');
    },
    onError: (error) => {
      toast.error('Failed to update formula: ' + error.message);
    },
  });

  const deleteFormula = useMutation({
    mutationFn: async (id: string) => {
      // Chemicals are deleted automatically via CASCADE
      const { error } = await supabase
        .from('power_washing_pricing_formulas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-formulas', shopId] });
      queryClient.invalidateQueries({ queryKey: ['formula-chemicals'] });
      toast.success('Pricing formula deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete formula: ' + error.message);
    },
  });

  const fetchFormulaChemicals = async (formulaId: string): Promise<FormulaChemical[]> => {
    const { data, error } = await supabase
      .from('power_washing_formula_chemicals')
      .select('*')
      .eq('formula_id', formulaId)
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  };

  const calculateQuote = (
    formula: PricingFormula,
    sqft: number,
    condition: ConditionLevel,
    shCostPerGallon: number = 3.50,
    laborRatePerHour: number = 75,
    surfactantCostPerOz: number = 0.50,
    surfactantOzPerGallon: number = 1.0
  ): QuoteCalculation => {
    // Get condition-specific values
    const pricePerSqft = formula[`price_per_sqft_${condition}`];
    const shConcentration = formula[`sh_concentration_${condition}`];
    
    // Calculate price (with minimum)
    const basePrice = sqft * pricePerSqft;
    const price = Math.max(basePrice, formula.minimum_charge);
    
    // Calculate chemical usage
    // mix_coverage_sqft = sqft covered per gallon of mixed solution
    const mixGallonsNeeded = sqft / formula.mix_coverage_sqft;
    
    // SH concentration is the % of SH in the final mix
    // Standard SH is 12.5%, so we calculate how much SH is needed
    const shGallonsNeeded = (mixGallonsNeeded * shConcentration) / 12.5;
    const shCost = shGallonsNeeded * shCostPerGallon;
    
    // Calculate surfactant usage (oz per gallon of mix)
    const surfactantOzNeeded = mixGallonsNeeded * surfactantOzPerGallon;
    const surfactantCost = surfactantOzNeeded * surfactantCostPerOz;
    
    // Total chemical cost
    const chemicalCost = shCost + surfactantCost;
    
    // Calculate labor
    const laborMinutes = ((sqft / 100) * formula.minutes_per_100sqft) + formula.setup_minutes;
    const laborCost = (laborMinutes / 60) * laborRatePerHour;
    
    // Calculate totals
    const totalCost = chemicalCost + laborCost;
    const profit = price - totalCost;
    const margin = price > 0 ? (profit / price) * 100 : 0;
    
    return {
      price,
      chemicalCost,
      shCost,
      surfactantCost,
      surfactantOzNeeded,
      laborMinutes,
      laborCost,
      totalCost,
      profit,
      margin,
      shGallonsNeeded,
      mixGallonsNeeded,
    };
  };

  return {
    formulas: formulasQuery.data || [],
    isLoading: formulasQuery.isLoading,
    error: formulasQuery.error,
    createFormula,
    updateFormula,
    deleteFormula,
    calculateQuote,
    useFormulaChemicals,
    fetchFormulaChemicals,
  };
}
