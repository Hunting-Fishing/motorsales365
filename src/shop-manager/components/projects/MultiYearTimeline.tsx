import { useState, useMemo } from 'react';
import { format, addMonths, startOfYear, endOfYear, eachMonthOfInterval, differenceInDays, isSameMonth, isWithinInterval, parseISO } from 'date-fns';
import { useProjectsTimeline } from '@/hooks/useProjectResources';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Milestone, FolderOpen, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { ProjectBudget, ProjectPhase } from '@/types/projectBudget';

interface MultiYearTimelineProps {
  onProjectSelect?: (projectId: string) => void;
}

export function MultiYearTimeline({ onProjectSelect }: MultiYearTimelineProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [zoomLevel, setZoomLevel] = useState<'year' | '2year' | '5year'>('year');
  
  const { projects, phases, isLoading } = useProjectsTimeline();

  // Calculate date range based on zoom
  const dateRange = useMemo(() => {
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    let yearEnd: Date;
    
    switch (zoomLevel) {
      case '2year':
        yearEnd = endOfYear(new Date(currentYear + 1, 0, 1));
        break;
      case '5year':
        yearEnd = endOfYear(new Date(currentYear + 4, 0, 1));
        break;
      default:
        yearEnd = endOfYear(yearStart);
    }
    
    return { start: yearStart, end: yearEnd };
  }, [currentYear, zoomLevel]);

  // Get months for the date range
  const months = useMemo(() => {
    return eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  // Calculate column width based on zoom
  const columnWidth = zoomLevel === '5year' ? 40 : zoomLevel === '2year' ? 60 : 80;

  // Group phases by project
  const projectsWithPhases = useMemo(() => {
    return projects.map(project => ({
      ...project,
      phases: phases.filter(p => p.project_id === project.id),
    }));
  }, [projects, phases]);

  // Get bar position and width for a date range
  const getBarStyle = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return null;
    
    const start = parseISO(startDate);
    const end = endDate ? parseISO(endDate) : start;
    
    if (start > dateRange.end || end < dateRange.start) return null;
    
    const effectiveStart = start < dateRange.start ? dateRange.start : start;
    const effectiveEnd = end > dateRange.end ? dateRange.end : end;
    
    const startMonthIdx = months.findIndex(m => 
      effectiveStart.getFullYear() === m.getFullYear() && 
      effectiveStart.getMonth() === m.getMonth()
    );
    
    const endMonthIdx = months.findIndex(m =>
      effectiveEnd.getFullYear() === m.getFullYear() &&
      effectiveEnd.getMonth() === m.getMonth()
    );
    
    if (startMonthIdx === -1) return null;
    
    const span = Math.max(1, (endMonthIdx === -1 ? months.length - 1 : endMonthIdx) - startMonthIdx + 1);
    
    return {
      left: startMonthIdx * columnWidth,
      width: span * columnWidth - 4,
    };
  };

  const statusColors: Record<string, string> = {
    planning: 'bg-blue-500',
    approved: 'bg-green-500',
    in_progress: 'bg-amber-500',
    on_hold: 'bg-orange-500',
    completed: 'bg-emerald-600',
    pending: 'bg-slate-400',
    delayed: 'bg-red-500',
  };

  const navigate = (direction: 'prev' | 'next') => {
    const step = zoomLevel === '5year' ? 5 : zoomLevel === '2year' ? 2 : 1;
    setCurrentYear(prev => direction === 'prev' ? prev - step : prev + step);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading timeline...</div>;
  }

  return (
    <div className="h-full flex flex-col border border-border rounded-lg bg-card">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentYear(new Date().getFullYear())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <h2 className="text-lg font-semibold ml-4">
            {zoomLevel === '5year' 
              ? `${currentYear} - ${currentYear + 4}`
              : zoomLevel === '2year'
              ? `${currentYear} - ${currentYear + 1}`
              : currentYear}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">View:</span>
          {(['year', '2year', '5year'] as const).map((level) => (
            <Button
              key={level}
              variant={zoomLevel === level ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setZoomLevel(level)}
            >
              {level === 'year' ? '1 Year' : level === '2year' ? '2 Years' : '5 Years'}
            </Button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex">
            {/* Project Names Column */}
            <div className="sticky left-0 z-10 bg-card border-r border-border w-[250px] shrink-0">
              {/* Header */}
              <div className="h-14 border-b border-border px-3 flex items-center font-medium text-sm bg-muted/30">
                <FolderOpen className="h-4 w-4 mr-2" />
                Projects & Phases
              </div>
              
              {/* Project Rows */}
              {projectsWithPhases.map((project) => (
                <div key={project.id}>
                  {/* Project Row */}
                  <div
                    className="h-12 border-b border-border px-3 flex items-center gap-2 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => onProjectSelect?.(project.id)}
                  >
                    <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{project.project_name}</div>
                      <div className="text-xs text-muted-foreground">{project.project_code}</div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {project.status}
                    </Badge>
                  </div>
                  
                  {/* Phase Rows */}
                  {project.phases?.map((phase: ProjectPhase) => (
                    <div
                      key={phase.id}
                      className="h-10 border-b border-border pl-8 pr-3 flex items-center gap-2 text-sm text-muted-foreground hover:bg-muted/20"
                    >
                      {(phase as any).is_milestone ? (
                        <Milestone className="h-3 w-3 shrink-0" />
                      ) : (
                        <div className="w-3 h-0.5 bg-border" />
                      )}
                      <span className="truncate">{phase.phase_name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Timeline Grid */}
            <div className="flex-1">
              {/* Month Headers */}
              <div className="flex h-14 border-b border-border bg-muted/30 sticky top-0 z-5">
                {months.map((month, idx) => {
                  const isYearStart = month.getMonth() === 0;
                  const isCurrentMonth = isSameMonth(month, new Date());
                  
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'shrink-0 border-r border-border flex flex-col items-center justify-center',
                        isCurrentMonth && 'bg-primary/10',
                        isYearStart && 'border-l-2 border-l-primary/30'
                      )}
                      style={{ width: columnWidth }}
                    >
                      {isYearStart && (
                        <span className="text-[10px] font-semibold text-primary">
                          {format(month, 'yyyy')}
                        </span>
                      )}
                      <span className={cn(
                        'text-xs font-medium',
                        isCurrentMonth && 'text-primary'
                      )}>
                        {format(month, zoomLevel === '5year' ? 'MMM' : 'MMM')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Project & Phase Rows */}
              <TooltipProvider>
                {projectsWithPhases.map((project) => (
                  <div key={project.id}>
                    {/* Project Row */}
                    <div className="flex h-12 border-b border-border relative">
                      {months.map((month, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'shrink-0 border-r border-border',
                            isSameMonth(month, new Date()) && 'bg-primary/5',
                            month.getMonth() === 0 && 'border-l-2 border-l-primary/10'
                          )}
                          style={{ width: columnWidth }}
                        />
                      ))}
                      
                      {/* Project Bar */}
                      {(() => {
                        const style = getBarStyle(project.planned_start_date, project.planned_end_date);
                        if (!style) return null;
                        
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'absolute top-2 h-8 rounded-md px-2 flex items-center cursor-pointer',
                                  'shadow-sm hover:shadow-md transition-shadow',
                                  statusColors[project.status] || 'bg-primary'
                                )}
                                style={{ left: style.left + 2, width: style.width }}
                                onClick={() => onProjectSelect?.(project.id)}
                              >
                                <span className="text-xs text-white font-medium truncate">
                                  {project.project_name}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-medium">{project.project_name}</p>
                                <p className="text-xs">
                                  {project.planned_start_date && format(parseISO(project.planned_start_date), 'MMM d, yyyy')}
                                  {project.planned_end_date && ` - ${format(parseISO(project.planned_end_date), 'MMM d, yyyy')}`}
                                </p>
                                <p className="text-xs">Budget: ${project.current_budget?.toLocaleString() || 0}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })()}
                    </div>
                    
                    {/* Phase Rows */}
                    {project.phases?.map((phase: ProjectPhase) => (
                      <div key={phase.id} className="flex h-10 border-b border-border relative">
                        {months.map((month, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'shrink-0 border-r border-border',
                              isSameMonth(month, new Date()) && 'bg-primary/5',
                              month.getMonth() === 0 && 'border-l-2 border-l-primary/10'
                            )}
                            style={{ width: columnWidth }}
                          />
                        ))}
                        
                        {/* Phase Bar or Milestone */}
                        {(() => {
                          if ((phase as any).is_milestone && (phase as any).milestone_date) {
                            const milestoneDate = parseISO((phase as any).milestone_date);
                            const monthIdx = months.findIndex(m => 
                              isSameMonth(m, milestoneDate)
                            );
                            if (monthIdx === -1) return null;
                            
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center"
                                    style={{ left: monthIdx * columnWidth + columnWidth / 2 - 12 }}
                                  >
                                    <Milestone className="h-5 w-5 text-amber-500" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{phase.phase_name}</p>
                                  <p className="text-xs">{format(milestoneDate, 'MMM d, yyyy')}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          }
                          
                          const style = getBarStyle(phase.planned_start, phase.planned_end);
                          if (!style) return null;
                          
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    'absolute top-1.5 h-7 rounded px-2 flex items-center',
                                    'border border-white/20 shadow-sm',
                                    statusColors[phase.status] || 'bg-slate-400'
                                  )}
                                  style={{ 
                                    left: style.left + 2, 
                                    width: style.width,
                                    opacity: 0.85,
                                  }}
                                >
                                  <span className="text-[10px] text-white font-medium truncate">
                                    {phase.phase_name}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-medium">{phase.phase_name}</p>
                                  <p className="text-xs">
                                    {phase.planned_start && format(parseISO(phase.planned_start), 'MMM d, yyyy')}
                                    {phase.planned_end && ` - ${format(parseISO(phase.planned_end), 'MMM d, yyyy')}`}
                                  </p>
                                  <p className="text-xs">{phase.percent_complete}% complete</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                ))}
              </TooltipProvider>

              {/* Empty State */}
              {projectsWithPhases.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <Calendar className="h-6 w-6 mr-2" />
                  No projects to display
                </div>
              )}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
