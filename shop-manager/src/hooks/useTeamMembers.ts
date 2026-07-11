
import { useState, useEffect, useCallback } from 'react';
import { TeamMember } from "@/types/team";
import { supabase } from '@/lib/supabase';
import { generateUniqueDisplayNames, formatDisplayName } from '@/utils/duplicateNameHandler';

interface ProfileData {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  created_at: string;
}

/**
 * Optimized hook for fetching team members with real-time updates
 * Fixes N+1 query problem by batching all data fetching
 */
export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Query 1: Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, middle_name, last_name, email, phone, job_title, department, created_at');

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setTeamMembers([]);
        return;
      }

      const profileIds = profiles.map(p => p.id);

      // Query 2: Fetch user roles with role names
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('user_id, roles:role_id(id, name)')
        .in('user_id', profileIds);

      // Create role map
      const roleMap = new Map<string, string>();
      if (userRolesData) {
        for (const ur of userRolesData) {
          const roleInfo = ur.roles as { id: string; name: string } | null;
          if (roleInfo?.name) {
            roleMap.set(ur.user_id, roleInfo.name);
          }
        }
      }

      // Query 3: Fetch profile metadata for deleted status
      const { data: metadataData } = await supabase
        .from('profile_metadata')
        .select('profile_id, metadata')
        .in('profile_id', profileIds);

      const metadataMap = new Map<string, Record<string, unknown>>();
      if (metadataData) {
        for (const md of metadataData) {
          if (md.metadata && typeof md.metadata === 'object') {
            metadataMap.set(md.profile_id, md.metadata as Record<string, unknown>);
          }
        }
      }

      // Query 4: Get latest status for ALL members at once
      const { data: statusData } = await supabase
        .from('team_member_history')
        .select('profile_id, details, timestamp')
        .in('profile_id', profileIds)
        .eq('action_type', 'status_change')
        .order('timestamp', { ascending: false });

      // Create a map of profile_id -> latest status
      const statusMap = new Map<string, { status: string; reason?: string; date?: string }>();
      if (statusData) {
        for (const record of statusData) {
          if (!statusMap.has(record.profile_id)) {
            const details = record.details as Record<string, unknown> | null;
            statusMap.set(record.profile_id, {
              status: (details?.new_status as string) || 'Active',
              reason: details?.reason as string | undefined,
              date: record.timestamp
            });
          }
        }
      }

      // Query 5: Get work order counts for ALL members at once
      const { data: workOrderCounts } = await supabase
        .from('work_orders')
        .select('technician_id, status')
        .in('technician_id', profileIds);

      // Create maps for assigned and completed counts
      const assignedMap = new Map<string, number>();
      const completedMap = new Map<string, number>();
      
      if (workOrderCounts) {
        for (const wo of workOrderCounts) {
          if (wo.technician_id) {
            if (wo.status !== 'Completed' && wo.status !== 'Cancelled') {
              assignedMap.set(wo.technician_id, (assignedMap.get(wo.technician_id) || 0) + 1);
            }
            if (wo.status === 'Completed') {
              completedMap.set(wo.technician_id, (completedMap.get(wo.technician_id) || 0) + 1);
            }
          }
        }
      }

      // Generate unique display names for duplicate detection
      const displayNameMap = generateUniqueDisplayNames(profiles);

      // Transform profiles to TeamMember objects
      const members: TeamMember[] = profiles
        .filter(profile => {
          const metadata = metadataMap.get(profile.id);
          return metadata?.status !== 'deleted';
        })
        .map(profile => {
          const displayInfo = displayNameMap.get(profile.id);
          const displayName = displayInfo 
            ? formatDisplayName(displayInfo) 
            : `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

          const roleName = roleMap.get(profile.id) || 'No Role Assigned';
          const statusInfo = statusMap.get(profile.id);
          const status = validateStatus(statusInfo?.status || 'Active');

          return {
            id: profile.id,
            name: displayName,
            email: profile.email || '',
            phone: profile.phone || '',
            role: roleName,
            jobTitle: profile.job_title || '',
            department: profile.department || '',
            status,
            statusChangeDate: statusInfo?.date,
            statusChangeReason: statusInfo?.reason,
            workOrders: {
              assigned: assignedMap.get(profile.id) || 0,
              completed: completedMap.get(profile.id) || 0
            }
          } as TeamMember;
        });

      setTeamMembers(members);
    } catch (err: unknown) {
      console.error('Error fetching team members:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load team members';
      setError(errorMessage);
      setTeamMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Real-time subscription for profile changes
  useEffect(() => {
    const channel = supabase
      .channel('team-members-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('Profile change detected, refreshing team members...');
          fetchTeamMembers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        () => {
          console.log('Role change detected, refreshing team members...');
          fetchTeamMembers();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_member_history' },
        () => {
          console.log('Status change detected, refreshing team members...');
          fetchTeamMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTeamMembers]);

  return { teamMembers, isLoading, error, refetch: fetchTeamMembers };
}

// Helper function to validate status
function validateStatus(status: string): TeamMember['status'] {
  const validStatuses: TeamMember['status'][] = ['Active', 'Inactive', 'On Leave', 'Terminated'];
  return validStatuses.includes(status as TeamMember['status']) 
    ? (status as TeamMember['status']) 
    : 'Active';
}
