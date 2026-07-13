import { useMemo } from 'react';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { ArrowRight, AlertTriangle, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils';
import type { ProjectPhase } from '@/types/projectBudget';

interface PhaseTimelineProps {
  phases: ProjectPhase[];
  projectStart?: string;
  projectEnd?: string;
}

interface TimelinePhase extends ProjectPhase {
  startDate: Date;
  endDate: Date;
  durationDays: number;
  offsetDays: number;
  isCritical: boolean;
  dependsOnName?: string;
}

export function PhaseTimeline({ phases, projectStart, projectEnd }: PhaseTimelineProps) {
  const { timelinePhases, criticalPath, totalDays, startDate } = useMemo(() => {
    if (phases.length === 0) return { timelinePhases: [], criticalPath: [], totalDays: 0, startDate: new Date() };

    // Calculate dates for each phase
    const phasesWithDates: TimelinePhase[] = phases
      .filter(p => p.planned_start && p.planned_end)
      .map(phase => {
        const startDate = parseISO(phase.planned_start!);
        const endDate = parseISO(phase.planned_end!);
        const dependsOn = phases.find(p => p.id === phase.depends_on_phase_id);
        
        return {
          ...phase,
          startDate,
          endDate,
          durationDays: differenceInDays(endDate, startDate) + 1,
          offsetDays: 0,
          isCritical: false,
          dependsOnName: dependsOn?.phase_name,
        };
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    if (phasesWithDates.length === 0) return { timelinePhases: [], criticalPath: [], totalDays: 0, startDate: new Date() };

    const projectStartDate = projectStart 
      ? parseISO(projectStart) 
      : phasesWithDates[0].startDate;
    
    const projectEndDate = projectEnd
      ? parseISO(projectEnd)
      : phasesWithDates.reduce((max, p) => p.endDate > max ? p.endDate : max, phasesWithDates[0].endDate);

    const totalDays = differenceInDays(projectEndDate, projectStartDate) + 1;

    // Calculate offsets
    phasesWithDates.forEach(phase => {
      phase.offsetDays = differenceInDays(phase.startDate, projectStartDate);
    });

    // Simple critical path: find longest chain of dependent phases
    const findCriticalPath = (): string[] => {
      const phaseMap = new Map(phasesWithDates.map(p => [p.id, p]));
      let longestPath: string[] = [];
      let longestDuration = 0;

      const calculatePath = (phaseId: string, currentPath: string[], currentDuration: number) => {
        const phase = phaseMap.get(phaseId);
        if (!phase) return;

        const newPath = [...currentPath, phaseId];
        const newDuration = currentDuration + phase.durationDays;

        // Find phases that depend on this one
        const dependents = phasesWithDates.filter(p => p.depends_on_phase_id === phaseId);
        
        if (dependents.length === 0) {
          if (newDuration > longestDuration) {
            longestDuration = newDuration;
            longestPath = newPath;
          }
        } else {
          dependents.forEach(dep => {
            calculatePath(dep.id, newPath, newDuration);
          });
        }
      };

      // Start from phases with no dependencies
      const rootPhases = phasesWithDates.filter(p => !p.depends_on_phase_id);
      rootPhases.forEach(phase => {
        calculatePath(phase.id, [], 0);
      });

      return longestPath;
    };

    const criticalPath = findCriticalPath();
    
    // Mark critical phases
    phasesWithDates.forEach(phase => {
      phase.isCritical = criticalPath.includes(phase.id);
    });

    return { 
      timelinePhases: phasesWithDates, 
      criticalPath,
      totalDays: Math.max(totalDays, 1),
      startDate: projectStartDate,
    };
  }, [phases, projectStart, projectEnd]);

  if (timelinePhases.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Add phases with planned dates to see the timeline.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string, isCritical: boolean) => {
    if (isCritical) {
      if (status === 'completed') return 'bg-green-600';
      if (status === 'delayed') return 'bg-red-600';
      return 'bg-amber-500';
    }
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'delayed': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const criticalDuration = timelinePhases
    .filter(p => p.isCritical)
    .reduce((sum, p) => sum + p.durationDays, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Project Timeline</CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500"></div>
              <span className="text-muted-foreground">Critical Path</span>
            </div>
            <Badge variant="outline">
              {criticalDuration} days critical path
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Timeline Header */}
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
          <span>{format(startDate, 'MMM d, yyyy')}</span>
          <span>{totalDays} days</span>
          <span>{format(addDays(startDate, totalDays - 1), 'MMM d, yyyy')}</span>
        </div>

        {/* Phase Bars */}
        <div className="space-y-3">
          {timelinePhases.map((phase, idx) => {
            const widthPercent = (phase.durationDays / totalDays) * 100;
            const leftPercent = (phase.offsetDays / totalDays) * 100;
            const dependsOnPhase = timelinePhases.find(p => p.id === phase.depends_on_phase_id);

            return (
              <TooltipProvider key={phase.id}>
                <div className="relative">
                  {/* Dependency Arrow */}
                  {dependsOnPhase && (
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 text-muted-foreground"
                      style={{ 
                        left: `calc(${leftPercent}% - 20px)`,
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {/* Phase Name */}
                    <div className="w-32 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        {phase.is_milestone && <Flag className="h-3 w-3 text-amber-500" />}
                        <span className="text-sm font-medium truncate">{phase.phase_name}</span>
                      </div>
                      {phase.isCritical && (
                        <span className="text-xs text-amber-600 font-medium">Critical</span>
                      )}
                    </div>

                    {/* Timeline Bar Container */}
                    <div className="flex-1 relative h-8 bg-muted/30 rounded">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all hover:opacity-80 ${getStatusColor(phase.status, phase.isCritical)} ${phase.isCritical ? 'ring-2 ring-amber-500/50' : ''}`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${Math.max(widthPercent, 2)}%`,
                            }}
                          >
                            {widthPercent > 15 && (
                              <div className="px-2 h-full flex items-center">
                                <span className="text-xs text-white font-medium truncate">
                                  {phase.percent_complete}%
                                </span>
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{phase.phase_name}</p>
                            <p className="text-xs">
                              {format(phase.startDate, 'MMM d')} - {format(phase.endDate, 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs">{phase.durationDays} days</p>
                            <p className="text-xs">Budget: {formatCurrency(phase.phase_budget)}</p>
                            <p className="text-xs">Progress: {phase.percent_complete}%</p>
                            {phase.dependsOnName && (
                              <p className="text-xs text-amber-400">
                                Depends on: {phase.dependsOnName}
                              </p>
                            )}
                            {phase.isCritical && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Critical Path
                              </Badge>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Duration */}
                    <div className="w-16 text-right text-xs text-muted-foreground flex-shrink-0">
                      {phase.durationDays}d
                    </div>
                  </div>
                </div>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-400"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>Delayed</span>
          </div>
          <div className="flex items-center gap-2">
            <Flag className="h-3 w-3 text-amber-500" />
            <span>Milestone</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
