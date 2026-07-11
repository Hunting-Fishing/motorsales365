import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Building2, 
  Shield, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface TeamOverviewStatsProps {
  totalMembers: number;
  activeMembers: number;
  departments: any[];
  roles: any[];
  onLeaveMembers?: number;
}

export function TeamOverviewStats({ 
  totalMembers, 
  activeMembers, 
  departments, 
  roles,
  onLeaveMembers = 0
}: TeamOverviewStatsProps) {
  const attendanceRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Team Health Overview */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Team Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Attendance Rate</span>
                <span className="text-sm text-muted-foreground">{attendanceRate}%</span>
              </div>
              <Progress value={attendanceRate} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Department Coverage</span>
                <span className="text-sm text-muted-foreground">
                  {departments.filter(d => d.memberCount > 0).length}/{departments.length}
                </span>
              </div>
              <Progress 
                value={(departments.filter(d => d.memberCount > 0).length / departments.length) * 100} 
                className="h-2" 
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{activeMembers}</div>
              <div className="text-xs text-muted-foreground">Active Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalMembers - activeMembers}</div>
              <div className="text-xs text-muted-foreground">Away/Offline</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{onLeaveMembers}</div>
              <div className="text-xs text-muted-foreground">On Leave</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Distribution */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            Department Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {departments.slice(0, 5).map((dept) => (
              <div key={dept.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-purple-600"></div>
                  <span className="text-sm font-medium">{dept.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{dept.memberCount}</span>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round((dept.memberCount / totalMembers) * 100)}%
                  </Badge>
                </div>
              </div>
            ))}
            {departments.length > 5 && (
              <div className="text-center pt-2">
                <span className="text-xs text-muted-foreground">
                  +{departments.length - 5} more departments
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {departments.length > 0 ? (
              departments.slice(0, 3).map((dept, index) => (
                <div key={dept.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <div className="space-y-1">
                    <p className="text-sm">{dept.name} has {dept.memberCount} members</p>
                    <p className="text-xs text-muted-foreground">Active department</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}