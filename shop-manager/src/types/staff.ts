
export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  job_title?: string;
  department?: string;
  created_at: string;
  updated_at: string;
  roles?: Array<{
    id: string;
    name: string;
  }>;
}

export interface StaffRole {
  id: string;
  name: string;
  permissions?: string[];
}

export interface StaffDepartment {
  id: string;
  name: string;
  description?: string;
}
