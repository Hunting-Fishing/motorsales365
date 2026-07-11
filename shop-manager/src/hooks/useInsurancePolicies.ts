import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InsurancePolicy, InsuranceFormData, InsuranceStats } from '@/types/insurance';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';

export function useInsurancePolicies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all insurance policies
  const { data: policies = [], isLoading, error, refetch } = useQuery({
    queryKey: ['insurance-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_insurance')
        .select(`
          *,
          equipment:equipment_assets(id, name, equipment_type),
          vehicle:vehicles(id, make, model, year)
        `)
        .order('expiration_date', { ascending: true });

      if (error) throw error;
      return (data || []) as InsurancePolicy[];
    },
  });

  // Calculate stats
  const stats: InsuranceStats = {
    totalPolicies: policies.length,
    activePolicies: policies.filter(p => p.status === 'active').length,
    expiredPolicies: policies.filter(p => p.status === 'expired').length,
    pendingRenewals: policies.filter(p => p.status === 'pending_renewal').length,
    totalPremiums: policies.reduce((sum, p) => sum + Number(p.premium_amount || 0), 0),
    totalCoverage: policies.reduce((sum, p) => sum + Number(p.coverage_amount || 0), 0),
    expiringIn30Days: policies.filter(p => {
      const days = differenceInDays(parseISO(p.expiration_date), startOfDay(new Date()));
      return days >= 0 && days <= 30 && p.status === 'active';
    }).length,
    expiringIn60Days: policies.filter(p => {
      const days = differenceInDays(parseISO(p.expiration_date), startOfDay(new Date()));
      return days >= 0 && days <= 60 && p.status === 'active';
    }).length,
    expiringIn90Days: policies.filter(p => {
      const days = differenceInDays(parseISO(p.expiration_date), startOfDay(new Date()));
      return days >= 0 && days <= 90 && p.status === 'active';
    }).length,
  };

  // Get upcoming renewals (policies expiring soon)
  const upcomingRenewals = policies
    .filter(p => p.status === 'active')
    .map(p => ({
      ...p,
      daysUntilExpiry: differenceInDays(parseISO(p.expiration_date), startOfDay(new Date())),
    }))
    .filter(p => p.daysUntilExpiry <= 90)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  // Create policy mutation
  const createPolicy = useMutation({
    mutationFn: async (formData: InsuranceFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user.id)
        .single();

      if (!profile?.shop_id) throw new Error('No shop found');

      const { error } = await supabase.from('asset_insurance').insert({
        shop_id: profile.shop_id,
        equipment_id: formData.equipment_id || null,
        vehicle_id: formData.vehicle_id || null,
        policy_number: formData.policy_number,
        insurance_provider: formData.insurance_provider,
        insurance_type: formData.insurance_type,
        coverage_description: formData.coverage_description || null,
        coverage_amount: formData.coverage_amount ? parseFloat(formData.coverage_amount) : null,
        deductible: formData.deductible ? parseFloat(formData.deductible) : null,
        premium_amount: parseFloat(formData.premium_amount),
        payment_frequency: formData.payment_frequency,
        effective_date: formData.effective_date,
        expiration_date: formData.expiration_date,
        renewal_reminder_days: parseInt(formData.renewal_reminder_days) || 30,
        auto_renew: formData.auto_renew,
        agent_name: formData.agent_name || null,
        agent_phone: formData.agent_phone || null,
        agent_email: formData.agent_email || null,
        notes: formData.notes || null,
        status: 'active',
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-policies'] });
      toast({
        title: 'Policy Created',
        description: 'Insurance policy has been added successfully.',
      });
    },
    onError: (error) => {
      console.error('Error creating policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to create insurance policy.',
        variant: 'destructive',
      });
    },
  });

  // Update policy mutation
  const updatePolicy = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsuranceFormData> }) => {
      const updateData: any = {};
      
      if (data.equipment_id !== undefined) updateData.equipment_id = data.equipment_id || null;
      if (data.vehicle_id !== undefined) updateData.vehicle_id = data.vehicle_id || null;
      if (data.policy_number) updateData.policy_number = data.policy_number;
      if (data.insurance_provider) updateData.insurance_provider = data.insurance_provider;
      if (data.insurance_type) updateData.insurance_type = data.insurance_type;
      if (data.coverage_description !== undefined) updateData.coverage_description = data.coverage_description;
      if (data.coverage_amount) updateData.coverage_amount = parseFloat(data.coverage_amount);
      if (data.deductible) updateData.deductible = parseFloat(data.deductible);
      if (data.premium_amount) updateData.premium_amount = parseFloat(data.premium_amount);
      if (data.payment_frequency) updateData.payment_frequency = data.payment_frequency;
      if (data.effective_date) updateData.effective_date = data.effective_date;
      if (data.expiration_date) updateData.expiration_date = data.expiration_date;
      if (data.renewal_reminder_days) updateData.renewal_reminder_days = parseInt(data.renewal_reminder_days);
      if (data.auto_renew !== undefined) updateData.auto_renew = data.auto_renew;
      if (data.agent_name !== undefined) updateData.agent_name = data.agent_name;
      if (data.agent_phone !== undefined) updateData.agent_phone = data.agent_phone;
      if (data.agent_email !== undefined) updateData.agent_email = data.agent_email;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const { error } = await supabase
        .from('asset_insurance')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-policies'] });
      toast({
        title: 'Policy Updated',
        description: 'Insurance policy has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to update insurance policy.',
        variant: 'destructive',
      });
    },
  });

  // Delete policy mutation
  const deletePolicy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('asset_insurance')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-policies'] });
      toast({
        title: 'Policy Deleted',
        description: 'Insurance policy has been removed.',
      });
    },
    onError: (error) => {
      console.error('Error deleting policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete insurance policy.',
        variant: 'destructive',
      });
    },
  });

  // Update status (for renewal, cancellation, etc.)
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('asset_insurance')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-policies'] });
      toast({
        title: 'Status Updated',
        description: 'Policy status has been updated.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update policy status.',
        variant: 'destructive',
      });
    },
  });

  return {
    policies,
    stats,
    upcomingRenewals,
    isLoading,
    error,
    refetch,
    createPolicy,
    updatePolicy,
    deletePolicy,
    updateStatus,
  };
}
