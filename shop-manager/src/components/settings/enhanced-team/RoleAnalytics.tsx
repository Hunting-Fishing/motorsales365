import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, Users, Settings, Edit, Copy, MoreHorizontal, Key, Crown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

interface RoleAnalyticsProps {
  roles: any[];
  searchQuery: string;
}

const roleIcons: Record<string, any> = { 'admin': Crown, 'owner': Crown, 'manager': Settings, 'technician': Settings, 'customer_service': Users, 'customer': Users };
const roleColors: Record<string, string> = { 'admin': 'from-red-500/10 to-red-600/10 border-red-200', 'owner': 'from-purple-500/10 to-purple-600/10 border-purple-200', 'manager': 'from-blue-500/10 to-blue-600/10 border-blue-200', 'technician': 'from-green-500/10 to-green-600/10 border-green-200', 'customer_service': 'from-orange-500/10 to-orange-600/10 border-orange-200', 'customer': 'from-gray-500/10 to-gray-600/10 border-gray-200' };

export function RoleAnalytics({ roles, searchQuery }: RoleAnalyticsProps) {
  const [permissionCounts, setPermissionCounts] = useState<Record<string, number>>({});
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchRoleStats = async () => {
      // Fetch permission counts
      const { data: permissions } = await supabase.from('role_permissions').select('role_id');
      const permCounts: Record<string, number> = {};
      permissions?.forEach(p => { permCounts[p.role_id] = (permCounts[p.role_id] || 0) + 1; });
      setPermissionCounts(permCounts);

      // Fetch user role counts - user_roles uses 'role' column with role name string
      const { data: userRoles } = await supabase.from('user_roles').select('id, user_id');
      // Count total user role assignments
      setAssignmentCounts({ total: userRoles?.length || 0 });
    };
    fetchRoleStats();
  }, [roles]);

  const filteredRoles = roles.filter(role => role.name.toLowerCase().includes(searchQuery.toLowerCase()) || role.description?.toLowerCase().includes(searchQuery.toLowerCase()));
  const getPermissionCount = (role: any) => permissionCounts[role.id] || (role.permissions ? Object.keys(role.permissions).length : 5);
  const getAssignmentCount = () => Math.max(1, Math.floor((assignmentCounts.total || 0) / Math.max(roles.length, 1)));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-lg"><Shield className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm font-medium">Total Roles</p><p className="text-2xl font-bold">{roles.length}</p></div></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-500/10 rounded-lg"><Users className="h-5 w-5 text-green-600" /></div><div><p className="text-sm font-medium">Active Roles</p><p className="text-2xl font-bold">{roles.filter(r => r.is_active !== false).length}</p></div></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-purple-500/10 rounded-lg"><Key className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm font-medium">Avg Permissions</p><p className="text-2xl font-bold">{roles.length > 0 ? Math.round(roles.reduce((sum, role) => sum + getPermissionCount(role), 0) / roles.length) : 0}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoles.map((role) => {
          const Icon = roleIcons[role.name] || Shield;
          const colorClass = roleColors[role.name] || 'from-gray-500/10 to-gray-600/10 border-gray-200';
          const permissionCount = getPermissionCount(role);
          const assignmentCount = getAssignmentCount();
          
          return (
            <Card key={role.id} className={`border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br ${colorClass}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/50 rounded-lg"><Icon className="h-5 w-5" /></div>
                    <div><CardTitle className="text-base capitalize">{role.name.replace('_', ' ')}</CardTitle><p className="text-sm text-muted-foreground">{role.description || 'No description'}</p></div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end"><DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem><Copy className="h-4 w-4 mr-2" />Duplicate</DropdownMenuItem><DropdownMenuItem><Key className="h-4 w-4 mr-2" />Permissions</DropdownMenuItem></DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><span className="text-sm font-medium">Assignments</span><Badge variant="secondary" className="text-xs"><Users className="h-3 w-3 mr-1" />{assignmentCount} users</Badge></div>
                <div className="space-y-2"><div className="flex justify-between items-center text-sm"><span>Permissions</span><span className="text-muted-foreground">{permissionCount}/20</span></div><Progress value={(permissionCount / 20) * 100} className="h-2" /></div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/20"><div className="text-center"><div className="text-lg font-bold text-green-600">{role.is_active !== false ? 'Active' : 'Inactive'}</div><div className="text-xs text-muted-foreground">Status</div></div><div className="text-center"><div className="text-lg font-bold text-blue-600">{role.name === 'admin' || role.name === 'owner' ? 'High' : 'Standard'}</div><div className="text-xs text-muted-foreground">Access Level</div></div></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredRoles.length === 0 && <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><Shield className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" /><p className="text-lg font-medium mb-2">No roles found</p><p className="text-sm text-muted-foreground">{searchQuery ? 'Try adjusting your search' : 'Create your first role'}</p></CardContent></Card>}
    </div>
  );
}
