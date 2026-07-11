
import { useState } from "react";
import { TeamMember } from "@/types/team";

export function useTeamFilters(teamMembers: TeamMember[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  
  // Get unique values for filters
  const roles = Array.from(new Set(teamMembers.map(member => member.role))).sort();
  const departments = Array.from(new Set(teamMembers.map(member => member.department))).sort();
  const statuses = Array.from(new Set(teamMembers.map(member => member.status))).sort();
  
  // Apply filters to team members
  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch = 
      !searchQuery ||
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = 
      roleFilter.length === 0 || roleFilter.includes(member.role);
    
    const matchesDepartment = 
      departmentFilter.length === 0 || departmentFilter.includes(member.department);
    
    const matchesStatus = 
      statusFilter.length === 0 || statusFilter.includes(member.status);
    
    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setRoleFilter([]);
    setDepartmentFilter([]);
    setStatusFilter([]);
  };

  return {
    // Filter states
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    departmentFilter,
    setDepartmentFilter,
    statusFilter,
    setStatusFilter,
    
    // Filter options
    roles,
    departments,
    statuses,
    
    // Filtered data
    filteredMembers,
    
    // Actions
    resetFilters
  };
}
