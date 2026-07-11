import { useMemo } from 'react';
import type { ProjectPhase } from '@/types/projectBudget';
import { differenceInDays } from 'date-fns';

interface CriticalPathResult {
  criticalPhases: string[];
  projectDuration: number;
  totalSlack: number;
  isValid: boolean;
}

export function useCriticalPath(phases: ProjectPhase[]): CriticalPathResult {
  return useMemo(() => {
    if (phases.length === 0) {
      return { criticalPhases: [], projectDuration: 0, totalSlack: 0, isValid: false };
    }

    const phaseMap = new Map<string, ProjectPhase>();
    phases.forEach(p => phaseMap.set(p.id, p));

    const getDuration = (phase: ProjectPhase): number => {
      if (phase.planned_start && phase.planned_end) {
        return Math.max(1, differenceInDays(new Date(phase.planned_end), new Date(phase.planned_start)));
      }
      return 7;
    };

    // Forward pass
    const forwardPass: Map<string, { es: number; ef: number }> = new Map();
    
    const calculateForward = (phaseId: string, visited: Set<string> = new Set()): { es: number; ef: number } => {
      if (visited.has(phaseId)) return forwardPass.get(phaseId) || { es: 0, ef: 0 };
      visited.add(phaseId);
      
      const phase = phaseMap.get(phaseId);
      if (!phase) return { es: 0, ef: 0 };
      
      let earliestStart = 0;
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

    let projectDuration = 0;
    forwardPass.forEach(({ ef }) => {
      projectDuration = Math.max(projectDuration, ef);
    });

    // Backward pass
    const backwardPass: Map<string, { ls: number; lf: number }> = new Map();
    const dependentOf = new Set(phases.map(p => p.depends_on_phase_id).filter(Boolean));
    const endPhases = phases.filter(p => !dependentOf.has(p.id));
    
    const calculateBackward = (phaseId: string, visited: Set<string> = new Set()): { ls: number; lf: number } => {
      if (visited.has(phaseId)) return backwardPass.get(phaseId) || { ls: projectDuration, lf: projectDuration };
      visited.add(phaseId);
      
      const phase = phaseMap.get(phaseId);
      if (!phase) return { ls: projectDuration, lf: projectDuration };
      
      let latestFinish = projectDuration;
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
    phases.forEach(p => {
      if (!backwardPass.has(p.id)) {
        calculateBackward(p.id, new Set());
      }
    });

    // Identify critical path
    const criticalPhases: string[] = [];
    let totalSlack = 0;
    
    phases.forEach(phase => {
      const forward = forwardPass.get(phase.id) || { es: 0, ef: 0 };
      const backward = backwardPass.get(phase.id) || { ls: 0, lf: 0 };
      const slack = backward.ls - forward.es;
      totalSlack += slack;
      
      if (slack === 0) {
        criticalPhases.push(phase.id);
      }
    });

    return {
      criticalPhases,
      projectDuration,
      totalSlack,
      isValid: true,
    };
  }, [phases]);
}
