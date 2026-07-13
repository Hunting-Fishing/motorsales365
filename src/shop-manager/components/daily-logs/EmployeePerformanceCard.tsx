import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Users, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { EmployeePerformance } from '@/hooks/useMaintenanceTrends';

interface EmployeePerformanceCardProps {
  employees: EmployeePerformance[];
  isLoading: boolean;
}

export function EmployeePerformanceCard({ employees, isLoading }: EmployeePerformanceCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No maintenance data with assigned employees in this period</p>
        </CardContent>
      </Card>
    );
  }

  const getComplianceBadge = (rate: number) => {
    if (rate >= 90) {
      return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Excellent</Badge>;
    } else if (rate >= 70) {
      return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Good</Badge>;
    } else if (rate >= 50) {
      return <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30">Needs Improvement</Badge>;
    } else {
      return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Critical</Badge>;
    }
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-yellow-500';
    if (rate >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Calculate team averages
  const avgCompliance = employees.length > 0
    ? Math.round(employees.reduce((sum, e) => sum + e.complianceRate, 0) / employees.length)
    : 0;

  const totalLate = employees.reduce((sum, e) => sum + e.lateCount, 0);
  const totalMaintenance = employees.reduce((sum, e) => sum + e.totalMaintenance, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Performance
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Team Avg:</span>
              <span className="font-semibold">{avgCompliance}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Total Late:</span>
              <span className="font-semibold text-red-600">{totalLate}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Early</TableHead>
                <TableHead className="text-center">On Time</TableHead>
                <TableHead className="text-center">Late</TableHead>
                <TableHead>Compliance Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">{employee.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono">{employee.totalMaintenance}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-blue-600">{employee.earlyCount}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-green-600">{employee.onTimeCount}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-red-600">{employee.lateCount}</span>
                    {employee.lateCount > 3 && (
                      <AlertTriangle className="h-3 w-3 text-red-500 inline ml-1" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={employee.complianceRate} 
                        className="h-2 w-20"
                      />
                      <span className="text-sm font-mono w-10">
                        {employee.complianceRate}%
                      </span>
                      {employee.complianceRate >= avgCompliance ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getComplianceBadge(employee.complianceRate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            Above team average
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-red-500" />
            Below team average
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-red-500" />
            High late count (&gt;3)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
