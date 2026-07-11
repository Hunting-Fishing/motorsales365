import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Building2, 
  Shield, 
  UserCheck, 
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  TrendingUp,
  Activity,
  Calendar,
  Settings
} from 'lucide-react';
import { useDepartmentMembers } from '@/hooks/team/useDepartmentMembers';
import { useTeamRolesPage } from '@/hooks/useTeamRolesPage';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { TeamOverviewStats } from './enhanced-team/TeamOverviewStats';
import { TeamMembersGrid } from './enhanced-team/TeamMembersGrid';
import { DepartmentAnalytics } from './enhanced-team/DepartmentAnalytics';
import { RoleAnalytics } from './enhanced-team/RoleAnalytics';
import { TeamAnalytics } from './enhanced-team/TeamAnalytics';
import { TeamActivityTimeline } from './enhanced-team/TeamActivityTimeline';
import { QuickActions } from './enhanced-team/QuickActions';
import { AdvancedFilters } from './enhanced-team/AdvancedFilters';

export function EnhancedTeamDashboard() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const { departmentsWithMembers, isLoading } = useDepartmentMembers();
  const { filteredRoles } = useTeamRolesPage();

  // Calculate real stats from live data
  const { teamMembers } = useTeamMembers();
  const totalMembers = teamMembers.length;
  const activeDepartments = departmentsWithMembers.filter(dept => dept.memberCount > 0).length;
  const totalRoles = filteredRoles.length;
  const activeMembers = teamMembers.filter(member => member.status === 'Active').length;
  const onLeaveMembers = teamMembers.filter(member => member.status === 'On Leave').length;
  const totalWorkOrders = teamMembers.reduce((sum, member) => sum + member.workOrders.assigned, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground">
            Comprehensive dashboard for managing departments, roles, and team members
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button 
            size="sm" 
            className="bg-gradient-to-r from-primary to-primary/80"
            onClick={() => navigate('/team/create')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Members</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalMembers}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {totalWorkOrders} work orders assigned
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Active Today</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">{activeMembers}</p>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
                  <Activity className="h-3 w-3 mr-1" />
                  {totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0}% active
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Departments</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{activeDepartments}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center mt-1">
                  <Building2 className="h-3 w-3 mr-1" />
                  {departmentsWithMembers.length} total
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Roles</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{totalRoles}</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center mt-1">
                  <Shield className="h-3 w-3 mr-1" />
                  Active permissions
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members, departments, or roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departmentsWithMembers.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {filteredRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-muted" : ""}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {showFilters && (
            <>
              <Separator className="my-4" />
              <AdvancedFilters />
            </>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <TeamOverviewStats 
                totalMembers={totalMembers}
                activeMembers={activeMembers}
                departments={departmentsWithMembers}
                roles={filteredRoles}
                onLeaveMembers={onLeaveMembers}
              />
              <QuickActions />
            </div>
            <div>
              <TeamActivityTimeline />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <TeamMembersGrid 
            searchQuery={searchQuery}
            selectedDepartment={selectedDepartment}
            selectedRole={selectedRole}
          />
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <DepartmentAnalytics 
            departments={departmentsWithMembers}
            searchQuery={searchQuery}
          />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <RoleAnalytics 
            roles={filteredRoles}
            searchQuery={searchQuery}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Team Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <TeamAnalytics />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <TeamAnalytics />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}