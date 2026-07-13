import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Wrench, AlertTriangle } from 'lucide-react';
import { useAllProjectResources } from '@/hooks/useProjectResources';
import { differenceInDays, isWithinInterval, parseISO, startOfMonth, endOfMonth, format, addMonths } from 'date-fns';

interface ResourceUtilizationData {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  totalPlannedHours: number;
  projectCount: number;
  utilizationPercent: number;
  isOverallocated: boolean;
  projects: { projectName: string; hours: number }[];
}

export function ResourceUtilizationChart() {
  const { resources, isLoading } = useAllProjectResources();

  const utilizationData = useMemo(() => {
    if (!resources?.length) return [];

    // Group by resource
    const resourceMap = new Map<string, ResourceUtilizationData>();
    
    resources.forEach((assignment: any) => {
      const key = `${assignment.resource_type}-${assignment.resource_id}`;
      
      if (!resourceMap.has(key)) {
        resourceMap.set(key, {
          resourceId: assignment.resource_id,
          resourceName: assignment.resource_name || 'Unknown',
          resourceType: assignment.resource_type,
          totalPlannedHours: 0,
          projectCount: 0,
          utilizationPercent: 0,
          isOverallocated: false,
          projects: [],
        });
      }
      
      const data = resourceMap.get(key)!;
      data.totalPlannedHours += assignment.planned_hours || 0;
      data.projectCount += 1;
      
      if (assignment.project?.project_name) {
        data.projects.push({
          projectName: assignment.project.project_name,
          hours: assignment.planned_hours || 0,
        });
      }
    });

    // Calculate utilization (assuming 160 hours/month standard capacity)
    const monthlyCapacity = 160;
    
    return Array.from(resourceMap.values()).map(data => ({
      ...data,
      utilizationPercent: (data.totalPlannedHours / monthlyCapacity) * 100,
      isOverallocated: data.totalPlannedHours > monthlyCapacity,
    })).sort((a, b) => b.utilizationPercent - a.utilizationPercent);
  }, [resources]);

  const overallocatedCount = utilizationData.filter(r => r.isOverallocated).length;
  const staffData = utilizationData.filter(r => r.resourceType === 'employee');
  const equipmentData = utilizationData.filter(r => r.resourceType !== 'employee');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading resource data...
        </CardContent>
      </Card>
    );
  }

  if (utilizationData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No resource assignments found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{utilizationData.length}</div>
            <p className="text-sm text-muted-foreground">Total Resources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{staffData.length}</div>
            <p className="text-sm text-muted-foreground">Staff Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${overallocatedCount > 0 ? 'text-destructive' : ''}`}>
              {overallocatedCount}
            </div>
            <p className="text-sm text-muted-foreground">Overallocated</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Utilization */}
      {staffData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff Utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {staffData.slice(0, 10).map((resource) => (
              <div key={resource.resourceId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{resource.resourceName}</span>
                    {resource.isOverallocated && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {resource.totalPlannedHours}h across {resource.projectCount} projects
                    </span>
                    <Badge 
                      variant={resource.isOverallocated ? 'destructive' : resource.utilizationPercent > 80 ? 'secondary' : 'outline'}
                    >
                      {resource.utilizationPercent.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={Math.min(resource.utilizationPercent, 100)} 
                  className={`h-2 ${resource.isOverallocated ? '[&>div]:bg-destructive' : ''}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Equipment Utilization */}
      {equipmentData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Equipment Utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {equipmentData.slice(0, 10).map((resource) => (
              <div key={resource.resourceId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{resource.resourceName}</span>
                  <Badge variant="outline">
                    {resource.projectCount} projects
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {resource.projects.map(p => p.projectName).join(', ')}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
