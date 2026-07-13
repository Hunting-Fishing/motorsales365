
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  status: "Active" | "Inactive" | "On Leave" | "Terminated";
  statusChangeDate?: string;
  statusChangeReason?: string;
  workOrders: {
    assigned: number;
    completed: number;
  };
  permissions?: Record<string, any>; // Optional permissions for custom roles
  notes?: string;
  joinDate?: string;
  lastActive?: string;
  recentActivity?: Array<{
    type: string;
    date: string;
    description: string;
    flagged?: boolean;
    flagReason?: string;
  }>;
  previousAssignments?: Array<{
    workOrderId: string;
    assignedDate: string;
    completedDate?: string;
    status: string;
  }>;
}

// Additional interfaces for team management
export interface Role {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  permissions: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  priority: number; // Added priority field for role ordering
}

// Unified interface for role management
export interface RoleManagement {
  roles: Role[];
  addRole: (role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>) => Role;
  updateRole: (id: string, data: Partial<Role>) => Role | null;
  deleteRole: (id: string) => boolean;
  getRoleById: (id: string) => Role | null;
  getRoleByName: (name: string) => Role | null;
}

// Interface for tracking status changes - stored as activities in work_order_activities
export interface TechnicianStatusChange {
  id: string;
  technicianId: string;
  previousStatus: string;
  newStatus: string;
  changeDate: string;
  changeReason?: string;
  changedBy: string;
}

// Interface for flagged activities - stored as activities in work_order_activities
export interface FlaggedActivity {
  id: string;
  technicianId: string;
  activityId: string;
  activityType: string;
  flaggedDate: string;
  flaggedBy: string;
  flagReason: string;
  resolved: boolean;
  resolvedDate?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}
