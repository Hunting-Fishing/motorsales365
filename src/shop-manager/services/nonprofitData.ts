import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type {
  Program,
  Volunteer,
  Member,
  Donation,
  ProgramParticipant,
  ImpactMeasurement,
  CreateProgramData,
  CreateVolunteerData,
  CreateMemberData,
  CreateDonationData,
  CreateParticipantData,
  CreateImpactMeasurementData,
  CreateVolunteerAssignmentData
} from "@/types/nonprofit";

// Programs
export const usePrograms = () => {
  return useQuery({
    queryKey: ["nonprofit-programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nonprofit_programs")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Program[];
    },
  });
};

export const useCreateProgram = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateProgramData) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data: program, error } = await supabase
        .from("nonprofit_programs")
        .insert({
          ...data,
          shop_id: profile?.shop_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return program;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nonprofit-programs"] });
      toast({
        title: "Success",
        description: "Program created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create program: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Volunteers
export const useVolunteers = () => {
  return useQuery({
    queryKey: ["volunteers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volunteers")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Volunteer[];
    },
  });
};

export const useCreateVolunteer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateVolunteerData) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data: volunteer, error } = await supabase
        .from("volunteers")
        .insert({
          ...data,
          shop_id: profile?.shop_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          volunteer_hours: 0,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return volunteer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
      toast({
        title: "Success",
        description: "Volunteer created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create volunteer: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Members
export const useMembers = () => {
  return useQuery({
    queryKey: ["nonprofit-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nonprofit_members")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Member[];
    },
  });
};

export const useCreateMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMemberData) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data: member, error } = await supabase
        .from("nonprofit_members")
        .insert({
          ...data,
          shop_id: profile?.shop_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nonprofit-members"] });
      toast({
        title: "Success",
        description: "Member created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create member: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Donations
export const useDonations = () => {
  return useQuery({
    queryKey: ["donation-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_transactions")
        .select(`
          *,
          nonprofit_programs(name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Donation[];
    },
  });
};

export const useCreateDonation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateDonationData) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data: donation, error } = await supabase
        .from("donation_transactions")
        .insert({
          ...data,
          shop_id: profile?.shop_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return donation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donation-transactions"] });
      toast({
        title: "Success",
        description: "Donation recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record donation: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Program Participants
export const useProgramParticipants = (programId?: string) => {
  return useQuery({
    queryKey: ["program-beneficiaries", programId],
    queryFn: async () => {
      let query = supabase
        .from("program_beneficiaries")
        .select(`
          *,
          nonprofit_programs(name)
        `)
        .order("created_at", { ascending: false });

      if (programId) {
        query = query.eq("program_id", programId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as ProgramParticipant[];
    },
    enabled: !programId || !!programId,
  });
};

export const useCreateParticipant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateParticipantData) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data: participant, error } = await supabase
        .from("program_beneficiaries")
        .insert({
          ...data,
          shop_id: profile?.shop_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return participant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-beneficiaries"] });
      toast({
        title: "Success",
        description: "Participant added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add participant: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Volunteer Assignments
export const useCreateVolunteerAssignment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateVolunteerAssignmentData) => {
      if (!data.program_id) {
        throw new Error("Program ID is required for volunteer assignment");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data: assignment, error } = await supabase
        .from("nonprofit_program_volunteers")
        .insert({
          volunteer_id: data.volunteer_id,
          program_id: data.program_id,
          role: data.role,
          start_date: data.start_date,
          end_date: data.end_date,
          hours_committed: data.hours_committed || 0,
          notes: data.notes,
          shop_id: profile?.shop_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          hours_completed: 0,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer-assignments"] });
      toast({
        title: "Success",
        description: "Volunteer assigned successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to assign volunteer: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Use existing impact_metrics table instead of impact_measurements
export const useImpactMeasurements = (programId?: string) => {
  return useQuery({
    queryKey: ["impact-measurements", programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impact_metrics")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
};

export const useCreateImpactMeasurement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateImpactMeasurementData) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data: measurement, error } = await supabase
        .from("impact_metrics")
        .insert({
          category: "program_outcome",
          metric_name: data.metric_name,
          metric_type: "quantitative",
          current_value: data.metric_value,
          measurement_unit: data.measurement_unit,
          program_id: data.program_id,
          shop_id: profile?.shop_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          notes: data.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return measurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impact-measurements"] });
      toast({
        title: "Success",
        description: "Impact measurement recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record measurement: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Analytics queries for real-time data
export const useNonprofitStats = () => {
  return useQuery({
    queryKey: ["nonprofit-stats"],
    queryFn: async () => {
      const [programsData, volunteersData, membersData, donationsData] = await Promise.all([
        supabase.from("nonprofit_programs").select("*"),
        supabase.from("volunteers").select("*"),
        supabase.from("nonprofit_members").select("*"),
        supabase.from("donation_transactions").select("*")
      ]);

      const activePrograms = programsData.data?.filter(p => p.status === 'active').length || 0;
      const totalVolunteers = volunteersData.data?.filter(v => v.status === 'active').length || 0;
      const activeMembers = membersData.data?.filter(m => m.membership_status === 'active').length || 0;
      const totalDonations = donationsData.data?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      return {
        activePrograms,
        totalVolunteers,
        activeMembers,
        totalDonations,
        programsData: programsData.data || [],
        volunteersData: volunteersData.data || [],
        membersData: membersData.data || [],
        donationsData: donationsData.data || []
      };
    },
  });
};