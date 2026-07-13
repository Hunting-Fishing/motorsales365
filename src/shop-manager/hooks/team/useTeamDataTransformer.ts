
import { TeamMember } from "@/types/team";
import { Customer } from "@/types/customer";
import { Vehicle } from "@/types/vehicle";

export function useTeamDataTransformer() {
  const transformData = (profiles: any[], userRoles: any[], workOrderData: any[]) => {
    // Implementation that doesn't depend on useFetchWorkOrders
    return profiles.map(profile => ({
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      job_title: profile.job_title,
      department: profile.department,
      status: 'Active' as const,
      // Transform work order data if needed
      activeWorkOrders: workOrderData.filter(wo => wo.technician_id === profile.id).length || 0
    }));
  };

  return { transformData };
}
