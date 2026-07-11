
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { TeamMember } from "@/types/team";
import { toast } from "@/hooks/use-toast";
import { getProfileMetadata } from "@/lib/profileMetadata";

export function useTeamMemberProfile(id: string | undefined) {
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch member data from Supabase
    const fetchMemberData = async () => {
      setLoading(true);
      try {
        if (!id) {
          setMember(null);
          setLoading(false);
          return;
        }
        
        // First get the user profile data with more fields
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            job_title,
            department,
            created_at
          `)
          .eq('id', id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (!profileData) {
          setMember(null);
          return;
        }

        console.log('Profile data loaded:', profileData);

        // Get user's role with a more detailed query
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select(`
            role_id,
            roles:roles(id, name, description)
          `)
          .eq('user_id', id);
          
        if (rolesError) {
          console.error('Error fetching roles:', rolesError);
        }

        console.log('User roles data:', userRoles);

        // Get user's recent activity
        const { data: activityData } = await supabase
          .from('work_order_activities')
          .select('*')
          .eq('user_id', id)
          .order('timestamp', { ascending: false })
          .limit(5);

        // Transform activity data to match the expected format
        const recentActivity = activityData?.map(activity => ({
          type: 'workOrder',
          date: activity.timestamp || new Date().toISOString(),
          description: activity.action
        })) || [];

        // Extract role information
        let userRole = 'User'; // Default role
        
        if (userRoles && userRoles.length > 0) {
          const roleData = userRoles[0].roles;
          console.log('Role data:', roleData);
          
          // Fix the type issue with the roleData handling
          if (roleData) {
            if (typeof roleData === 'object' && roleData !== null && 'name' in roleData) {
              // Role is nested in an object
              const roleName = roleData.name;
              
              // Ensure roleName is treated as a string with a proper type guard
              if (roleName && typeof roleName === 'string') {
                // Format the role name (capitalize, replace underscores)
                const roleNameStr: string = roleName;
                const words = roleNameStr.split('_');
                userRole = words
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
              }
            } else if (typeof roleData === 'string') {
              // Role is directly a string
              const roleDataStr: string = roleData;
              const words = roleDataStr.split('_');
              userRole = words
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
          }
          
          console.log('Formatted role name:', userRole);
        }

        // Get additional profile metadata (notes, etc.)
        const metadata = await getProfileMetadata(id);
        let notes = "";
        
        // Properly type check and extract notes from metadata
        if (metadata && typeof metadata === 'object' && metadata !== null) {
          notes = metadata.notes || "";
        }
        
        // Fetch work order data for this user
        const { data: assignedWorkOrders, error: assignedError } = await supabase
          .from('work_orders')
          .select('id, status')
          .eq('technician_id', id);
          
        if (assignedError) {
          console.error('Error fetching assigned work orders:', assignedError);
        }
        
        // Count assigned and completed work orders
        const assignedCount = assignedWorkOrders?.length || 0;
        const completedCount = assignedWorkOrders?.filter(wo => wo.status === 'completed')?.length || 0;
        
        // Create the member object with the fetched data
        const memberData: TeamMember = {
          id: profileData.id,
          name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Unknown User',
          role: userRole || 'User',
          email: profileData.email || '',
          phone: profileData.phone || '',
          jobTitle: profileData.job_title || '', // Use empty string if not available
          department: profileData.department || '', // Use empty string if not available
          status: "Active", // Default status
          workOrders: {
            assigned: assignedCount,
            completed: completedCount
          },
          notes: notes,
          recentActivity,
          joinDate: profileData.created_at,
          lastActive: recentActivity?.[0]?.date || profileData.created_at
        };

        console.log('Team member data to be set:', memberData);
        setMember(memberData);
      } catch (error) {
        console.error("Error fetching team member:", error);
        toast({
          title: "Error",
          description: "Failed to load team member data.",
          variant: "destructive",
        });
        setMember(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMemberData();
    } else {
      setLoading(false);
    }
  }, [id]);

  return { member, loading };
}
