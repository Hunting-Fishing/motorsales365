import { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import type { ProjectBudget, ProjectPhase } from '@/types/projectBudget';

interface EarnedValueAnalysisProps {
  project: ProjectBudget;
  phases: ProjectPhase[];
}

interface EVMetrics {
  // Core EV metrics
  BAC: number;  // Budget at Completion
  PV: number;   // Planned Value
  EV: number;   // Earned Value
  AC: number;   // Actual Cost
  
  // Variances
  SV: number;   // Schedule Variance (EV - PV)
  CV: number;   // Cost Variance (EV - AC)
  
  // Performance Indices
  SPI: number;  // Schedule Performance Index (EV / PV)
  CPI: number;  // Cost Performance Index (EV / AC)
  
  // Forecasts
  EAC: number;  // Estimate at Completion (BAC / CPI)
  ETC: number;  // Estimate to Complete (EAC - AC)
  VAC: number;  // Variance at Completion (BAC - EAC)
  TCPI: number; // To-Complete Performance Index
  
  // Progress
  percentComplete: number;
  percentScheduled: number;
}

export function EarnedValueAnalysis({ project, phases }: EarnedValueAnalysisProps) {
  const metrics = useMemo<EVMetrics>(() => {
    const BAC = project.current_budget || project.original_budget || 0;
    const AC = project.actual_spent || 0;
    
    // Calculate percent complete from phases
    const totalBudget = phases.reduce((sum, p) => sum + (p.phase_budget || 0), 0) || BAC;
    const weightedProgress = phases.reduce((sum, p) => {
      const weight = totalBudget > 0 ? (p.phase_budget || 0) / totalBudget : 1 / (phases.length || 1);
      return sum + (weight * (p.percent_complete || 0));
    }, 0);
    
    const percentComplete = phases.length > 0 ? weightedProgress : 0;
    
    // Calculate percent scheduled based on dates
    let percentScheduled = 0;
    if (project.planned_start_date && project.planned_end_date) {
      const start = new Date(project.planned_start_date).getTime();
      const end = new Date(project.planned_end_date).getTime();
      const now = new Date().getTime();
      const totalDuration = end - start;
      const elapsed = now - start;
      percentScheduled = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0;
    }
    
    // Earned Value = % complete * BAC
    const EV = (percentComplete / 100) * BAC;
    
    // Planned Value = % scheduled * BAC
    const PV = (percentScheduled / 100) * BAC;
    
    // Variances
    const SV = EV - PV;
    const CV = EV - AC;
    
    // Performance Indices (avoid division by zero)
    const SPI = PV > 0 ? EV / PV : 1;
    const CPI = AC > 0 ? EV / AC : 1;
    
    // Forecasts
    const EAC = CPI > 0 ? BAC / CPI : BAC;
    const ETC = EAC - AC;
    const VAC = BAC - EAC;
    
    // TCPI = (BAC - EV) / (BAC - AC)
    const remaining = BAC - AC;
    const TCPI = remaining > 0 ? (BAC - EV) / remaining : 1;
    
    return {
      BAC, PV, EV, AC,
      SV, CV,
      SPI, CPI,
      EAC, ETC, VAC, TCPI,
      percentComplete,
      percentScheduled,
    };
  }, [project, phases]);

  const getPerformanceStatus = (index: number): { color: string; label: string; icon: typeof CheckCircle } => {
    if (index >= 1) return { color: 'text-green-600', label: 'On Track', icon: CheckCircle };
    if (index >= 0.9) return { color: 'text-yellow-600', label: 'At Risk', icon: AlertTriangle };
    return { color: 'text-red-600', label: 'Behind', icon: TrendingDown };
  };

  const spiStatus = getPerformanceStatus(metrics.SPI);
  const cpiStatus = getPerformanceStatus(metrics.CPI);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Earned Value Analysis</CardTitle>
          <div className="flex gap-2">
            <Badge variant={metrics.SPI >= 1 ? 'default' : 'destructive'}>
              SPI: {metrics.SPI.toFixed(2)}
            </Badge>
            <Badge variant={metrics.CPI >= 1 ? 'default' : 'destructive'}>
              CPI: {metrics.CPI.toFixed(2)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Work Complete</span>
              <span className="font-medium">{metrics.percentComplete.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.percentComplete} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Schedule Elapsed</span>
              <span className="font-medium">{metrics.percentScheduled.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.percentScheduled} className="h-2 bg-muted" />
          </div>
        </div>

        {/* Core Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Budget (BAC)</p>
            <p className="text-lg font-semibold">{formatCurrency(metrics.BAC)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Earned Value (EV)</p>
            <p className="text-lg font-semibold">{formatCurrency(metrics.EV)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Planned Value (PV)</p>
            <p className="text-lg font-semibold">{formatCurrency(metrics.PV)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Actual Cost (AC)</p>
            <p className="text-lg font-semibold">{formatCurrency(metrics.AC)}</p>
          </div>
        </div>

        {/* Performance Indices */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Schedule Performance (SPI)</span>
              </div>
              <spiStatus.icon className={`h-4 w-4 ${spiStatus.color}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${spiStatus.color}`}>
                {metrics.SPI.toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground">{spiStatus.label}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.SPI >= 1 
                ? `Ahead of schedule by ${formatCurrency(Math.abs(metrics.SV))}`
                : `Behind schedule by ${formatCurrency(Math.abs(metrics.SV))}`
              }
            </p>
          </div>

          <div className="p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cost Performance (CPI)</span>
              </div>
              <cpiStatus.icon className={`h-4 w-4 ${cpiStatus.color}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${cpiStatus.color}`}>
                {metrics.CPI.toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground">{cpiStatus.label}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.CPI >= 1 
                ? `Under budget by ${formatCurrency(Math.abs(metrics.CV))}`
                : `Over budget by ${formatCurrency(Math.abs(metrics.CV))}`
              }
            </p>
          </div>
        </div>

        {/* Forecasts */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <h4 className="text-sm font-medium mb-3">Forecast at Completion</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Estimate at Completion</p>
              <p className={`font-semibold ${metrics.EAC > metrics.BAC ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(metrics.EAC)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Estimate to Complete</p>
              <p className="font-semibold">{formatCurrency(metrics.ETC)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Variance at Completion</p>
              <p className={`font-semibold ${metrics.VAC < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.VAC >= 0 ? '+' : ''}{formatCurrency(metrics.VAC)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">To-Complete PI (TCPI)</p>
              <p className={`font-semibold ${metrics.TCPI > 1.1 ? 'text-red-600' : 'text-foreground'}`}>
                {metrics.TCPI.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Interpretation */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>SPI {'>'} 1.0</strong>: Ahead of schedule | <strong>SPI {'<'} 1.0</strong>: Behind schedule</p>
          <p>• <strong>CPI {'>'} 1.0</strong>: Under budget | <strong>CPI {'<'} 1.0</strong>: Over budget</p>
          <p>• <strong>TCPI {'>'} 1.1</strong>: Difficult to complete on budget</p>
        </div>
      </CardContent>
    </Card>
  );
}
