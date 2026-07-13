import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Edit,
  Plus,
  MoreHorizontal,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DepartmentAnalyticsProps {
  departments: any[];
  searchQuery: string;
}

const departmentIcons: Record<string, any> = {
  'Service Operations': Building2,
  'Customer Service': UserCheck,
  'Administration': Building2,
  'Management': Users,
  'Parts & Inventory': Building2,
  'Quality Control': AlertCircle,
  'Finance & Accounting': Building2,
  'IT & Technical Support': Building2,
};

export function DepartmentAnalytics({ departments, searchQuery }: DepartmentAnalyticsProps) {
  const filteredDepartments = departments.filter(dept => 
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMembers = departments.reduce((sum, dept) => sum + dept.memberCount, 0);

  return (
    <div className="space-y-6">
      {/* Department Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Departments</p>
                <p className="text-2xl font-bold">{departments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Active Departments</p>
                <p className="text-2xl font-bold">
                  {departments.filter(d => d.memberCount > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Avg Team Size</p>
                <p className="text-2xl font-bold">
                  {departments.length > 0 ? Math.round(totalMembers / departments.length) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDepartments.map((department) => {
          const Icon = departmentIcons[department.name] || Building2;
          const utilizationRate = totalMembers > 0 ? (department.memberCount / totalMembers) * 100 : 0;
          
          return (
            <Card key={department.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{department.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {department.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Department
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Member
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Users className="h-4 w-4 mr-2" />
                        View Members
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Team Size</span>
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {department.memberCount} members
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Department Utilization</span>
                    <span className="text-muted-foreground">{utilizationRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={utilizationRate} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {Math.floor(department.memberCount * 0.9)}
                    </div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {department.memberCount - Math.floor(department.memberCount * 0.9)}
                    </div>
                    <div className="text-xs text-muted-foreground">Away</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDepartments.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No departments found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? 'Try adjusting your search criteria' 
                : 'Create your first department to get started'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}