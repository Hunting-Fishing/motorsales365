import { supabase } from '@/integrations/supabase/client';
import { HybridActivity, ComplianceRequirement, CreateHybridActivityData, CreateComplianceRequirementData, HybridActivityAnalytics } from '@/types/hybrid';

class HybridActivitiesService {
  
  // HYBRID ACTIVITIES CRUD
  async getActivities(): Promise<HybridActivity[]> {
    const { data, error } = await supabase
      .from('hybrid_activities')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching hybrid activities:', error);
      throw new Error('Failed to fetch hybrid activities');
    }
    
    return (data || []) as HybridActivity[];
  }
  
  async getActivity(id: string): Promise<HybridActivity | null> {
    const { data, error } = await supabase
      .from('hybrid_activities')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching hybrid activity:', error);
      throw new Error('Failed to fetch hybrid activity');
    }
    
    return data as HybridActivity;
  }
  
  async createActivity(activityData: CreateHybridActivityData): Promise<HybridActivity> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (!profile?.shop_id) {
      throw new Error('User profile not found');
    }
    
    // Validate percentage allocation
    if (activityData.for_profit_percentage + activityData.non_profit_percentage !== 100) {
      throw new Error('For-profit and non-profit percentages must total 100%');
    }
    
    const { data, error } = await supabase
      .from('hybrid_activities')
      .insert({
        ...activityData,
        shop_id: profile.shop_id,
        created_by: (await supabase.auth.getUser()).data.user?.id || '',
        status: activityData.status || 'active'
      } as any)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating hybrid activity:', error);
      throw new Error('Failed to create hybrid activity');
    }
    
    return data as HybridActivity;
  }
  
  async updateActivity(id: string, updates: Partial<CreateHybridActivityData>): Promise<HybridActivity> {
    // Validate percentage allocation if being updated
    if (updates.for_profit_percentage !== undefined || updates.non_profit_percentage !== undefined) {
      const activity = await this.getActivity(id);
      const forProfitPercentage = updates.for_profit_percentage ?? activity?.for_profit_percentage ?? 0;
      const nonProfitPercentage = updates.non_profit_percentage ?? activity?.non_profit_percentage ?? 0;
      
      if (forProfitPercentage + nonProfitPercentage !== 100) {
        throw new Error('For-profit and non-profit percentages must total 100%');
      }
    }
    
    const { data, error } = await supabase
      .from('hybrid_activities')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating hybrid activity:', error);
      throw new Error('Failed to update hybrid activity');
    }
    
    return data as HybridActivity;
  }
  
  async deleteActivity(id: string): Promise<void> {
    const { error } = await supabase
      .from('hybrid_activities')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting hybrid activity:', error);
      throw new Error('Failed to delete hybrid activity');
    }
  }
  
  // COMPLIANCE REQUIREMENTS CRUD
  async getComplianceRequirements(): Promise<ComplianceRequirement[]> {
    const { data, error } = await supabase
      .from('compliance_requirements')
      .select('*')
      .order('due_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching compliance requirements:', error);
      throw new Error('Failed to fetch compliance requirements');
    }
    
    return (data || []) as ComplianceRequirement[];
  }
  
  async getComplianceRequirement(id: string): Promise<ComplianceRequirement | null> {
    const { data, error } = await supabase
      .from('compliance_requirements')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching compliance requirement:', error);
      throw new Error('Failed to fetch compliance requirement');
    }
    
    return data as ComplianceRequirement;
  }
  
  async createComplianceRequirement(requirementData: CreateComplianceRequirementData): Promise<ComplianceRequirement> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (!profile?.shop_id) {
      throw new Error('User profile not found');
    }
    
    const { data, error } = await supabase
      .from('compliance_requirements')
      .insert({
        ...requirementData,
        shop_id: profile.shop_id,
        created_by: (await supabase.auth.getUser()).data.user?.id || '',
        completion_status: requirementData.completion_status || 'pending'
      } as any)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating compliance requirement:', error);
      throw new Error('Failed to create compliance requirement');
    }
    
    return data as ComplianceRequirement;
  }
  
  async updateComplianceRequirement(id: string, updates: Partial<CreateComplianceRequirementData>): Promise<ComplianceRequirement> {
    const { data, error } = await supabase
      .from('compliance_requirements')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating compliance requirement:', error);
      throw new Error('Failed to update compliance requirement');
    }
    
    return data as ComplianceRequirement;
  }
  
  async deleteComplianceRequirement(id: string): Promise<void> {
    const { error } = await supabase
      .from('compliance_requirements')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting compliance requirement:', error);
      throw new Error('Failed to delete compliance requirement');
    }
  }
  
  // ANALYTICS AND REPORTING
  async getAnalytics(): Promise<HybridActivityAnalytics> {
    const [activities, compliance] = await Promise.all([
      this.getActivities(),
      this.getComplianceRequirements()
    ]);
    
    const totalActivities = activities.length;
    const activeActivities = activities.filter(a => a.status === 'active').length;
    const totalForProfitRevenue = activities.reduce((sum, a) => sum + (a.revenue_for_profit || 0), 0);
    const totalNonProfitRevenue = activities.reduce((sum, a) => sum + (a.revenue_non_profit || 0), 0);
    const totalParticipants = activities.reduce((sum, a) => sum + (a.participants_count || 0), 0);
    const totalBeneficiaries = activities.reduce((sum, a) => sum + (a.beneficiaries_count || 0), 0);
    const totalVolunteerHours = activities.reduce((sum, a) => sum + (a.volunteer_hours || 0), 0);
    
    const completedCompliance = compliance.filter(c => c.completion_status === 'completed').length;
    const complianceCompletionRate = compliance.length > 0 ? (completedCompliance / compliance.length) * 100 : 0;
    
    // Calculate average activity duration
    const activitiesWithDates = activities.filter(a => a.start_date && a.end_date);
    const totalDuration = activitiesWithDates.reduce((sum, a) => {
      const start = new Date(a.start_date!);
      const end = new Date(a.end_date!);
      return sum + (end.getTime() - start.getTime());
    }, 0);
    const averageActivityDuration = activitiesWithDates.length > 0 
      ? totalDuration / activitiesWithDates.length / (1000 * 60 * 60 * 24) // days
      : 0;
    
    // Calculate revenue allocation accuracy (how close to proper 100% split)
    const allocationAccuracy = activities.reduce((sum, a) => {
      const total = a.for_profit_percentage + a.non_profit_percentage;
      return sum + (total === 100 ? 100 : Math.abs(100 - total));
    }, 0);
    const revenueAllocationAccuracy = activities.length > 0 
      ? (allocationAccuracy / activities.length) 
      : 100;
    
    return {
      totalActivities,
      activeActivities,
      totalForProfitRevenue,
      totalNonProfitRevenue,
      totalParticipants,
      totalBeneficiaries,
      totalVolunteerHours,
      complianceCompletionRate,
      averageActivityDuration,
      revenueAllocationAccuracy
    };
  }
  
  // UTILITY METHODS
  async getActivitiesByStatus(status: HybridActivity['status']): Promise<HybridActivity[]> {
    const { data, error } = await supabase
      .from('hybrid_activities')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching activities by status:', error);
      throw new Error('Failed to fetch activities by status');
    }
    
    return (data || []) as HybridActivity[];
  }
  
  async getOverdueCompliance(): Promise<ComplianceRequirement[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('compliance_requirements')
      .select('*')
      .lt('due_date', today)
      .neq('completion_status', 'completed')
      .order('due_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching overdue compliance:', error);
      throw new Error('Failed to fetch overdue compliance');
    }
    
    return (data || []) as ComplianceRequirement[];
  }
  
  async getUpcomingCompliance(days: number = 30): Promise<ComplianceRequirement[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
    
    const { data, error } = await supabase
      .from('compliance_requirements')
      .select('*')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', futureDate.toISOString().split('T')[0])
      .neq('completion_status', 'completed')
      .order('due_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching upcoming compliance:', error);
      throw new Error('Failed to fetch upcoming compliance');
    }
    
    return (data || []) as ComplianceRequirement[];
  }
}

export const hybridActivitiesService = new HybridActivitiesService();