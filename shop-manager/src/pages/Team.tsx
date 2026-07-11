
import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { TeamContent } from '@/components/team/TeamContent';
import { TeamHeader } from '@/components/team/TeamHeader';
import { TeamSearchFilters } from '@/components/team/TeamSearchFilters';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTeamFilters } from '@/hooks/useTeamFilters';
import TeamMemberProfile from './TeamMemberProfile';
import TeamMemberCreate from './TeamMemberCreate';
import { Badge } from '@/components/ui/badge';

/**
 * IMPORTANT: This page uses full team management functionality
 * DO NOT replace with placeholder text - full functionality exists
 * Includes: team member list, creation, roles, permissions, etc.
 */
export default function Team() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const location = useLocation();
  
  // Use real team data from the database
  const { teamMembers, isLoading, error, refetch } = useTeamMembers();
  
  // Refetch team members when returning to main team page
  React.useEffect(() => {
    if (location.pathname === '/team') {
      refetch?.();
    }
  }, [location.pathname, refetch]);
  
  // Use filtering hook
  const {
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    departmentFilter,
    setDepartmentFilter,
    statusFilter,
    setStatusFilter,
    roles,
    departments,
    statuses,
    filteredMembers,
    resetFilters
  } = useTeamFilters(teamMembers);
  
  if (error) {
    console.error('Error loading team members:', error);
  }

  // Calculate active filter count
  const activeFilterCount = 
    (searchQuery ? 1 : 0) +
    roleFilter.length +
    departmentFilter.length +
    statusFilter.length;
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Routes>
      <Route path="/" element={
        <div className="p-6 space-y-6">
          <TeamHeader />
          
          {/* Search and Filters */}
          <TeamSearchFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={setDepartmentFilter}
            availableRoles={roles}
            availableDepartments={departments}
            availableStatuses={statuses}
            onClearFilters={resetFilters}
            activeFilterCount={activeFilterCount}
          />

          {/* Results Count */}
          {!isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {filteredMembers.length} of {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
              </span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </Badge>
              )}
            </div>
          )}
          
          <TeamContent 
            members={filteredMembers}
            isLoading={isLoading}
            view={view}
            getInitials={getInitials}
          />
        </div>
      } />
      {/* Specific routes must come BEFORE dynamic routes */}
      <Route path="/create" element={<TeamMemberCreate />} />
      <Route path="/:id" element={<TeamMemberProfile />} />
      <Route path="/*" element={
        <TeamContent 
          members={filteredMembers}
          isLoading={isLoading}
          view={view}
          getInitials={getInitials}
        />
      } />
    </Routes>
  );
}
