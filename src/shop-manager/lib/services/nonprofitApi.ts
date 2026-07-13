import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { 
  Program, 
  Volunteer, 
  ProgramParticipant, 
  VolunteerAssignment, 
  ImpactMeasurementData,
  CreateProgramData,
  CreateVolunteerData,
  CreateParticipantData,
  CreateVolunteerAssignmentData,
  CreateImpactMeasurementData
} from '@/types/nonprofit';

type DbProgram = Database['public']['Tables']['programs']['Row'];
type DbVolunteer = Database['public']['Tables']['volunteers']['Row'];
type DbProgramParticipant = Database['public']['Tables']['program_participants']['Row'];
type DbVolunteerAssignment = Database['public']['Tables']['volunteer_assignments']['Row'];
type DbImpactMeasurement = Database['public']['Tables']['impact_measurements']['Row'];

// Transform functions to handle type conversions
const transformProgram = (dbProgram: DbProgram): Program => ({
  ...dbProgram,
  program_type: dbProgram.program_type as Program['program_type'],
  status: dbProgram.status as Program['status'],
  funding_sources: dbProgram.funding_sources as string[],
  success_metrics: dbProgram.success_metrics as string[]
});

const transformVolunteer = (dbVolunteer: DbVolunteer): Volunteer => ({
  ...dbVolunteer,
  skills: dbVolunteer.skills as string[],
  availability: dbVolunteer.availability as Record<string, any>,
  background_check_status: dbVolunteer.background_check_status as Volunteer['background_check_status'],
  training_completed: dbVolunteer.training_completed as string[],
  status: dbVolunteer.status as Volunteer['status']
});

const transformParticipant = (dbParticipant: DbProgramParticipant): ProgramParticipant => ({
  ...dbParticipant,
  status: dbParticipant.status as ProgramParticipant['status'],
  outcome_data: dbParticipant.outcome_data as Record<string, any>,
  demographics: dbParticipant.demographics as Record<string, any>
});

const transformAssignment = (dbAssignment: DbVolunteerAssignment): VolunteerAssignment => ({
  ...dbAssignment,
  status: dbAssignment.status as VolunteerAssignment['status']
});

const transformImpactMeasurement = (dbMeasurement: DbImpactMeasurement): ImpactMeasurementData => ({
  id: dbMeasurement.id,
  metric_id: dbMeasurement.id, // Use id as metric_id for compatibility
  measured_value: dbMeasurement.current_value || 0,
  measurement_date: dbMeasurement.last_measured_date || '',
  notes: dbMeasurement.notes || '',
  shop_id: dbMeasurement.shop_id,
  created_by: dbMeasurement.created_by,
  created_at: dbMeasurement.created_at,
  updated_at: dbMeasurement.updated_at,
  verification_date: '',
  verified_by: ''
});

// Program services
export const programService = {
  async getAll(): Promise<Program[]> {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(transformProgram);
  },

  async getById(id: string): Promise<Program | null> {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data ? transformProgram(data) : null;
  },

  async create(programData: CreateProgramData): Promise<Program> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.shop_id) throw new Error('Shop not found');

    const { data, error } = await supabase
      .from('programs')
      .insert({
        ...programData,
        shop_id: profile.shop_id,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return transformProgram(data);
  },

  async update(id: string, updates: Partial<CreateProgramData>): Promise<Program> {
    const { data, error } = await supabase
      .from('programs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return transformProgram(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getParticipants(programId: string): Promise<ProgramParticipant[]> {
    const { data, error } = await supabase
      .from('program_participants')
      .select('*')
      .eq('program_id', programId)
      .order('enrollment_date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(transformParticipant);
  }
};

// Volunteer services
export const volunteerService = {
  async getAll(): Promise<Volunteer[]> {
    const { data, error } = await supabase
      .from('volunteers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(transformVolunteer);
  },

  async getById(id: string): Promise<Volunteer | null> {
    const { data, error } = await supabase
      .from('volunteers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data ? transformVolunteer(data) : null;
  },

  async create(volunteerData: CreateVolunteerData): Promise<Volunteer> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.shop_id) throw new Error('Shop not found');

    const { data, error } = await supabase
      .from('volunteers')
      .insert({
        ...volunteerData,
        shop_id: profile.shop_id,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return transformVolunteer(data);
  },

  async update(id: string, updates: Partial<CreateVolunteerData>): Promise<Volunteer> {
    const { data, error } = await supabase
      .from('volunteers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return transformVolunteer(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('volunteers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getAssignments(volunteerId: string): Promise<VolunteerAssignment[]> {
    const { data, error } = await supabase
      .from('volunteer_assignments')
      .select('*')
      .eq('volunteer_id', volunteerId)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(transformAssignment);
  }
};

// Program participant services
export const participantService = {
  async getAll(): Promise<ProgramParticipant[]> {
    const { data, error } = await supabase
      .from('program_participants')
      .select('*')
      .order('enrollment_date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(transformParticipant);
  },

  async getById(id: string): Promise<ProgramParticipant | null> {
    const { data, error } = await supabase
      .from('program_participants')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data ? transformParticipant(data) : null;
  },

  async create(participantData: CreateParticipantData): Promise<ProgramParticipant> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.shop_id) throw new Error('Shop not found');

    const { data, error } = await supabase
      .from('program_participants')
      .insert({
        ...participantData,
        shop_id: profile.shop_id,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return transformParticipant(data);
  },

  async update(id: string, updates: Partial<CreateParticipantData>): Promise<ProgramParticipant> {
    const { data, error } = await supabase
      .from('program_participants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return transformParticipant(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('program_participants')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Volunteer assignment services
export const assignmentService = {
  async getAll(): Promise<VolunteerAssignment[]> {
    const { data, error } = await supabase
      .from('volunteer_assignments')
      .select('*')
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(transformAssignment);
  },

  async create(assignmentData: CreateVolunteerAssignmentData): Promise<VolunteerAssignment> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.shop_id) throw new Error('Shop not found');

    const { data, error } = await supabase
      .from('volunteer_assignments')
      .insert({
        ...assignmentData,
        shop_id: profile.shop_id,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return transformAssignment(data);
  },

  async update(id: string, updates: Partial<CreateVolunteerAssignmentData>): Promise<VolunteerAssignment> {
    const { data, error } = await supabase
      .from('volunteer_assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return transformAssignment(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('volunteer_assignments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Donation services
export const donationService = {
  async getAll(): Promise<any[]> {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .order('donation_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(donationData: any): Promise<any> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.shop_id) throw new Error('Shop not found');

    const { data, error } = await supabase
      .from('donations')
      .insert({
        ...donationData,
        shop_id: profile.shop_id,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('donations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('donations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Grant services
export const grantService = {
  async getAll(): Promise<any[]> {
    const { data, error } = await supabase
      .from('grants')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(grantData: any): Promise<any> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.shop_id) throw new Error('Shop not found');

    const { data, error } = await supabase
      .from('grants')
      .insert({
        ...grantData,
        shop_id: profile.shop_id,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('grants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('grants')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Financial health services
export const financialHealthService = {
  async getAll(): Promise<any[]> {
    const { data, error } = await supabase
      .from('financial_health')
      .select('*')
      .order('reporting_period', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(financialData: any): Promise<any> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.shop_id) throw new Error('Shop not found');

    const { data, error } = await supabase
      .from('financial_health')
      .insert({
        ...financialData,
        shop_id: profile.shop_id,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('financial_health')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('financial_health')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Donor analytics services
export const donorAnalyticsService = {
  async getAnalytics(): Promise<any> {
    const { data: donations, error } = await supabase
      .from('donations')
      .select('*');
    
    if (error) throw error;

    const donationData = donations || [];
    const totalDonations = donationData.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalDonors = new Set(donationData.map(d => d.donor_email)).size;
    const averageDonation = totalDonors > 0 ? totalDonations / totalDonors : 0;

    return {
      totalDonations,
      totalDonors,
      averageDonation,
      monthlyTrend: [], // Could be calculated based on donation dates
      donorRetentionRate: 0.75, // Placeholder - could be calculated
      majorGifts: donationData.filter(d => (d.amount || 0) > 1000).length
    };
  }
};

// Impact measurement services
export const impactMeasurementService = {
  async getAll(): Promise<ImpactMeasurementData[]> {
    const { data, error } = await supabase
      .from('impact_measurements')
      .select('*')
      .order('last_measured_date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(transformImpactMeasurement);
  },

  async create(measurementData: any): Promise<ImpactMeasurementData> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.shop_id) throw new Error('Shop not found');

    const { data, error } = await supabase
      .from('impact_measurements')
      .insert({
        measurement_name: measurementData.measurement_name,
        category: measurementData.category || 'general',
        measurement_type: measurementData.measurement_type || 'quantitative',
        current_value: measurementData.current_value || 0,
        target_value: measurementData.target_value,
        unit_of_measure: measurementData.unit_of_measure,
        measurement_period: measurementData.measurement_period || 'monthly',
        data_source: measurementData.data_source,
        verification_method: measurementData.verification_method,
        last_measured_date: measurementData.last_measured_date || new Date().toISOString().split('T')[0],
        next_measurement_date: measurementData.next_measurement_date,
        baseline_value: measurementData.baseline_value,
        baseline_date: measurementData.baseline_date,
        notes: measurementData.notes,
        shop_id: profile.shop_id,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return transformImpactMeasurement(data);
  },

  async update(id: string, updates: any): Promise<ImpactMeasurementData> {
    const { data, error } = await supabase
      .from('impact_measurements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return transformImpactMeasurement(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('impact_measurements')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getByMetric(metricName: string): Promise<ImpactMeasurementData[]> {
    const { data, error } = await supabase
      .from('impact_measurements')
      .select('*')
      .eq('measurement_name', metricName)
      .order('last_measured_date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(transformImpactMeasurement);
  },

  async getByCategory(category: string): Promise<ImpactMeasurementData[]> {
    const { data, error } = await supabase
      .from('impact_measurements')
      .select('*')
      .eq('category', category)
      .order('last_measured_date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(transformImpactMeasurement);
  },

  async getRealAnalytics(): Promise<{
    totalPeopleHelped: number;
    vehiclesRestored: number;
    toolKitsDistributed: number;
    co2Saved: number;
    metalRecycled: number;
    environmentalMetrics: any[];
  }> {
    const { data, error } = await supabase
      .from('impact_measurements')
      .select('*');
    
    if (error) throw error;

    const measurements = (data || []);
    
    // Calculate real metrics based on actual measurements
    const peopleHelped = measurements
      .filter(m => m.measurement_name?.toLowerCase().includes('people') || 
                   m.measurement_name?.toLowerCase().includes('participants') ||
                   m.measurement_name?.toLowerCase().includes('individuals'))
      .reduce((sum, m) => sum + (m.current_value || 0), 0);

    const vehicles = measurements
      .filter(m => m.measurement_name?.toLowerCase().includes('vehicle') ||
                   m.measurement_name?.toLowerCase().includes('car'))
      .reduce((sum, m) => sum + (m.current_value || 0), 0);

    const toolkits = measurements
      .filter(m => m.measurement_name?.toLowerCase().includes('tool') ||
                   m.measurement_name?.toLowerCase().includes('kit') ||
                   m.measurement_name?.toLowerCase().includes('equipment'))
      .reduce((sum, m) => sum + (m.current_value || 0), 0);

    const environmentalMeasurements = measurements.filter(m => m.category === 'environment');
    
    const co2 = environmentalMeasurements
      .filter(m => m.measurement_name?.toLowerCase().includes('co2') ||
                   m.measurement_name?.toLowerCase().includes('carbon') ||
                   m.measurement_name?.toLowerCase().includes('emission'))
      .reduce((sum, m) => sum + (m.current_value || 0), 0);

    const metal = environmentalMeasurements
      .filter(m => m.measurement_name?.toLowerCase().includes('metal') ||
                   m.measurement_name?.toLowerCase().includes('recycl'))
      .reduce((sum, m) => sum + (m.current_value || 0), 0);

    return {
      totalPeopleHelped: peopleHelped,
      vehiclesRestored: vehicles,
      toolKitsDistributed: toolkits,
      co2Saved: co2,
      metalRecycled: metal,
      environmentalMetrics: environmentalMeasurements
    };
  }
};

// Unified API object
export const nonprofitApi = {
  // Programs
  getPrograms: programService.getAll,
  getProgram: programService.getById,
  createProgram: programService.create,
  updateProgram: programService.update,
  deleteProgram: programService.delete,
  getProgramParticipants: programService.getParticipants,

  // Volunteers
  getVolunteers: volunteerService.getAll,
  getVolunteer: volunteerService.getById,
  createVolunteer: volunteerService.create,
  updateVolunteer: volunteerService.update,
  deleteVolunteer: volunteerService.delete,
  getVolunteerAssignments: volunteerService.getAssignments,

  // Participants
  getParticipants: participantService.getAll,
  getParticipant: participantService.getById,
  createParticipant: participantService.create,
  updateParticipant: participantService.update,
  deleteParticipant: participantService.delete,

  // Assignments
  getAssignments: assignmentService.getAll,
  createAssignment: assignmentService.create,
  updateAssignment: assignmentService.update,
  deleteAssignment: assignmentService.delete,

  // Impact Measurements
  getImpactMeasurements: impactMeasurementService.getAll,
  createImpactMeasurement: impactMeasurementService.create,
  updateImpactMeasurement: impactMeasurementService.update,
  deleteImpactMeasurement: impactMeasurementService.delete,
  getImpactMeasurementsByMetric: impactMeasurementService.getByMetric,
  getImpactMeasurementsByCategory: impactMeasurementService.getByCategory,
  getRealImpactAnalytics: impactMeasurementService.getRealAnalytics,

  // Donations
  getDonations: donationService.getAll,
  createDonation: donationService.create,
  updateDonation: donationService.update,
  deleteDonation: donationService.delete,

  // Grants
  getGrants: grantService.getAll,
  createGrant: grantService.create,
  updateGrant: grantService.update,
  deleteGrant: grantService.delete,

  // Financial Health
  getFinancialHealth: financialHealthService.getAll,
  createFinancialHealth: financialHealthService.create,
  updateFinancialHealth: financialHealthService.update,
  deleteFinancialHealth: financialHealthService.delete,

  // Donor Analytics
  getDonorAnalytics: donorAnalyticsService.getAnalytics
};