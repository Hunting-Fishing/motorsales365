import { useMemo } from 'react';
import { AlertTriangle, Clock, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { differenceInDays, format, addDays, isAfter } from 'date-fns';
import type { ProjectPhase } from '@/types/projectBudget';

interface CriticalPathAnalysisProps {
  phases: ProjectPhase[];
  projectStart?: string;
  projectEnd?: string;
}

interface CriticalPathPhase {
  phase: ProjectPhase;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  isCritical: boolean;
  dependencies: string[];
}

export function CriticalPathAnalysis({ phases, projectStart, projectEnd }: CriticalPathAnalysisProps) {
  const criticalPathData = useMemo(() => {
    if (phases.length === 0) return null;

    const baseDate = projectStart ? new Date(projectStart) : new Date();
    
    // Build dependency graph and calculate durations
    const phaseMap = new Map<string, ProjectPhase>();
    phases.forEach(p => phaseMap.set(p.id, p));

    const getDuration = (phase: ProjectPhase): number => {
      if (phase.planned_start && phase.planned_end) {
        return Math.max(1, differenceInDays(new Date(phase.planned_end), new Date(phase.planned_start)));
      }
      return 7; // Default 1 week if no dates
    };

    // Forward pass - calculate earliest start/finish
    const forwardPass: Map<string, { es: number; ef: number }> = new Map();
    
    const calculateForward = (phaseId: string, visited: Set<string> = new Set()): { es: number; ef: number } => {
      if (visited.has(phaseId)) return forwardPass.get(phaseId) || { es: 0, ef: 0 };
      visited.add(phaseId);
      
      const phase = phaseMap.get(phaseId);
      if (!phase) return { es: 0, ef: 0 };
      
      let earliestStart = 0;
      
      // Find predecessor's earliest finish
      if (phase.depends_on_phase_id) {
        const depResult = calculateForward(phase.depends_on_phase_id, visited);
        earliestStart = depResult.ef;
      }
      
      const duration = getDuration(phase);
      const result = { es: earliestStart, ef: earliestStart + duration };
      forwardPass.set(phaseId, result);
      return result;
    };

    phases.forEach(p => calculateForward(p.id, new Set()));

    // Find project end (max earliest finish)
    let projectDuration = 0;
    forwardPass.forEach(({ ef }) => {
      projectDuration = Math.max(projectDuration, ef);
    });

    // Backward pass - calculate latest start/finish
    const backwardPass: Map<string, { ls: number; lf: number }> = new Map();
    
    // Find phases that are not dependencies of any other phase (end phases)
    const dependentOf = new Set(phases.map(p => p.depends_on_phase_id).filter(Boolean));
    const endPhases = phases.filter(p => !dependentOf.has(p.id));
    
    const calculateBackward = (phaseId: string, visited: Set<string> = new Set()): { ls: number; lf: number } => {
      if (visited.has(phaseId)) return backwardPass.get(phaseId) || { ls: projectDuration, lf: projectDuration };
      visited.add(phaseId);
      
      const phase = phaseMap.get(phaseId);
      if (!phase) return { ls: projectDuration, lf: projectDuration };
      
      // Find successor's latest start
      let latestFinish = projectDuration;
      
      // Find phases that depend on this one
      const successors = phases.filter(p => p.depends_on_phase_id === phaseId);
      if (successors.length > 0) {
        latestFinish = Math.min(...successors.map(s => {
          const result = calculateBackward(s.id, visited);
          return result.ls;
        }));
      }
      
      const duration = getDuration(phase);
      const result = { ls: latestFinish - duration, lf: latestFinish };
      backwardPass.set(phaseId, result);
      return result;
    };

    endPhases.forEach(p => calculateBackward(p.id, new Set()));
    // Also calculate for phases that might not be end phases
    phases.forEach(p => {
      if (!backwardPass.has(p.id)) {
        calculateBackward(p.id, new Set());
      }
    });

    // Calculate slack and identify critical path
    const criticalPathPhases: CriticalPathPhase[] = phases.map(phase => {
      const forward = forwardPass.get(phase.id) || { es: 0, ef: 0 };
      const backward = backwardPass.get(phase.id) || { ls: 0, lf: 0 };
      const slack = backward.ls - forward.es;
      
      return {
        phase,
        earliestStart: forward.es,
        earliestFinish: forward.ef,
        latestStart: backward.ls,
        latestFinish: backward.lf,
        slack,
        isCritical: slack === 0,
        dependencies: phase.depends_on_phase_id ? [phase.depends_on_phase_id] : [],
      };
    });

    const criticalPath = criticalPathPhases.filter(p => p.isCritical);
    const totalSlack = criticalPathPhases.reduce((sum, p) => sum + p.slack, 0);
    const averageSlack = phases.length > 0 ? totalSlack / phases.length : 0;

    // Calculate schedule risk
    const today = new Date();
    const plannedEnd = projectEnd ? new Date(projectEnd) : addDays(baseDate, projectDuration);
    const daysRemaining = differenceInDays(plannedEnd, today);
    const isAtRisk = daysRemaining < projectDuration * 0.2; // Less than 20% buffer

    return {
      criticalPath,
      allPhases: criticalPathPhases,
      projectDuration,
      plannedEnd,
      daysRemaining,
      isAtRisk,
      averageSlack,
      baseDate,
    };
  }, [phases, projectStart, projectEnd]);

  if (!criticalPathData || phases.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Add phases with dates to see critical path analysis
        </CardContent>
      </Card>
    );
  }

  const { criticalPath, allPhases, projectDuration, daysRemaining, isAtRisk, averageSlack, baseDate } = criticalPathData;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Project Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectDuration} days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Critical Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalPath.length} phases</div>
            <p className="text-xs text-muted-foreground">No slack time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Days Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isAtRisk ? 'text-destructive' : ''}`}>
              {daysRemaining}
            </div>
            {isAtRisk && <Badge variant="destructive" className="mt-1">At Risk</Badge>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Slack
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageSlack.toFixed(1)} days</div>
            <p className="text-xs text-muted-foreground">Buffer per phase</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Path Phases */}
      {criticalPath.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Critical Path Phases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalPath.map((item, index) => (
                <div 
                  key={item.phase.id}
                  className="flex items-center gap-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.phase.phase_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Day {item.earliestStart} → Day {item.earliestFinish} 
                      ({item.earliestFinish - item.earliestStart} days)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{item.phase.percent_complete}%</div>
                    <Progress value={item.phase.percent_complete} className="w-20 h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Phases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Phase Schedule Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Phase</th>
                  <th className="text-center py-2 px-3">Duration</th>
                  <th className="text-center py-2 px-3">Earliest Start</th>
                  <th className="text-center py-2 px-3">Latest Start</th>
                  <th className="text-center py-2 px-3">Slack</th>
                  <th className="text-center py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {allPhases
                  .sort((a, b) => a.earliestStart - b.earliestStart)
                  .map((item) => (
                    <tr 
                      key={item.phase.id} 
                      className={`border-b ${item.isCritical ? 'bg-destructive/5' : ''}`}
                    >
                      <td className="py-2 px-3">
                        <div className="font-medium">{item.phase.phase_name}</div>
                        {item.dependencies.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Depends on: {phases.find(p => p.id === item.dependencies[0])?.phase_name}
                          </div>
                        )}
                      </td>
                      <td className="text-center py-2 px-3">
                        {item.earliestFinish - item.earliestStart} days
                      </td>
                      <td className="text-center py-2 px-3">
                        {format(addDays(baseDate, item.earliestStart), 'MMM d')}
                      </td>
                      <td className="text-center py-2 px-3">
                        {format(addDays(baseDate, item.latestStart), 'MMM d')}
                      </td>
                      <td className="text-center py-2 px-3">
                        <span className={item.slack === 0 ? 'text-destructive font-medium' : ''}>
                          {item.slack} days
                        </span>
                      </td>
                      <td className="text-center py-2 px-3">
                        {item.isCritical ? (
                          <Badge variant="destructive">Critical</Badge>
                        ) : (
                          <Badge variant="outline">Has Buffer</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
