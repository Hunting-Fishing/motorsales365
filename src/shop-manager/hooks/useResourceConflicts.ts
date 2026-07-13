import { useMemo } from 'react';
import { useAllProjectResources } from './useProjectResources';
import { format, parseISO, isWithinInterval, areIntervalsOverlapping } from 'date-fns';

export interface ResourceConflict {
  resourceId: string;
  resourceName: string;
  resourceType: 'employee' | 'equipment' | 'vessel' | 'vehicle';
  totalAllocation: number;
  overlapPeriod: { start: Date; end: Date };
  assignments: {
    projectId: string;
    projectName: string;
    phaseId: string | null;
    phaseName: string | null;
    allocationPercent: number;
    startDate: Date;
    endDate: Date;
  }[];
  severity: 'warning' | 'critical';
}

export function useResourceConflicts() {
  const { resources, isLoading } = useAllProjectResources();

  const conflicts = useMemo(() => {
    if (!resources || resources.length === 0) return [];

    // Group assignments by resource
    const resourceMap = new Map<string, typeof resources>();
    
    resources.forEach(resource => {
      if (!resource.start_date || !resource.end_date) return;
      
      const key = `${resource.resource_type}-${resource.resource_id}`;
      if (!resourceMap.has(key)) {
        resourceMap.set(key, []);
      }
      resourceMap.get(key)!.push(resource);
    });

    const detectedConflicts: ResourceConflict[] = [];

    // Check each resource for overlapping assignments
    resourceMap.forEach((assignments, key) => {
      if (assignments.length < 2) return;

      // Sort by start date
      const sorted = [...assignments].sort((a, b) => 
        new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime()
      );

      // Check all pairs for overlaps
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i];
          const b = sorted[j];

          const aStart = parseISO(a.start_date!);
          const aEnd = parseISO(a.end_date!);
          const bStart = parseISO(b.start_date!);
          const bEnd = parseISO(b.end_date!);

          // Check if intervals overlap
          if (areIntervalsOverlapping(
            { start: aStart, end: aEnd },
            { start: bStart, end: bEnd }
          )) {
            const overlapStart = aStart > bStart ? aStart : bStart;
            const overlapEnd = aEnd < bEnd ? aEnd : bEnd;
            const totalAllocation = a.allocation_percent + b.allocation_percent;

            // Only flag if total allocation > 100%
            if (totalAllocation > 100) {
              // Check if we already have a conflict for this resource in this period
              const existingConflict = detectedConflicts.find(c => 
                c.resourceId === a.resource_id &&
                c.resourceType === a.resource_type &&
                areIntervalsOverlapping(
                  { start: c.overlapPeriod.start, end: c.overlapPeriod.end },
                  { start: overlapStart, end: overlapEnd }
                )
              );

              if (existingConflict) {
                // Add to existing conflict if not already there
                if (!existingConflict.assignments.find(x => x.projectId === b.project_id)) {
                  existingConflict.assignments.push({
                    projectId: b.project_id,
                    projectName: `Project ${b.project_id.slice(0, 8)}`,
                    phaseId: b.phase_id,
                    phaseName: null,
                    allocationPercent: b.allocation_percent,
                    startDate: bStart,
                    endDate: bEnd
                  });
                  existingConflict.totalAllocation += b.allocation_percent;
                  existingConflict.severity = existingConflict.totalAllocation > 150 ? 'critical' : 'warning';
                }
              } else {
                detectedConflicts.push({
                  resourceId: a.resource_id,
                  resourceName: a.resource_name || `${a.resource_type} ${a.resource_id.slice(0, 8)}`,
                  resourceType: a.resource_type,
                  totalAllocation,
                  overlapPeriod: { start: overlapStart, end: overlapEnd },
                  assignments: [
                    {
                      projectId: a.project_id,
                      projectName: `Project ${a.project_id.slice(0, 8)}`,
                      phaseId: a.phase_id,
                      phaseName: null,
                      allocationPercent: a.allocation_percent,
                      startDate: aStart,
                      endDate: aEnd
                    },
                    {
                      projectId: b.project_id,
                      projectName: `Project ${b.project_id.slice(0, 8)}`,
                      phaseId: b.phase_id,
                      phaseName: null,
                      allocationPercent: b.allocation_percent,
                      startDate: bStart,
                      endDate: bEnd
                    }
                  ],
                  severity: totalAllocation > 150 ? 'critical' : 'warning'
                });
              }
            }
          }
        }
      }
    });

    return detectedConflicts.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return b.totalAllocation - a.totalAllocation;
    });
  }, [resources]);

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    criticalCount: conflicts.filter(c => c.severity === 'critical').length,
    warningCount: conflicts.filter(c => c.severity === 'warning').length,
    isLoading
  };
}
