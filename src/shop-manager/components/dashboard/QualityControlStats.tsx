
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChecklistStat, DashboardStats } from "@/types/dashboard";
import { Loader2, CheckCircle2, AlertCircle, BarChart3 } from "lucide-react";

interface QualityControlStatsProps {
  stats: DashboardStats;
  checklistData: ChecklistStat[];
  isLoading: boolean;
}

export function QualityControlStats({ stats, checklistData, isLoading }: QualityControlStatsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quality Control</CardTitle>
          <CardDescription>Inspection pass rates and quality metrics</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Calculate average checklist completion rate
  const avgCompletionRate = checklistData.length > 0 
    ? checklistData.reduce((sum, stat) => sum + stat.completionRate, 0) / checklistData.length
    : 0;
  
  // Format as percentage with no decimal places
  const formattedCompletionRate = `${Math.round(avgCompletionRate)}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Control</CardTitle>
        <CardDescription>Inspection pass rates and quality metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center gap-4 p-3 rounded-lg bg-green-50 border border-green-100">
            <div className="rounded-full bg-green-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Inspection Pass Rate</p>
              <p className="text-2xl font-bold text-green-800">{stats.qualityControlPassRate || "0%"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <div className="rounded-full bg-blue-100 p-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Checklist Completion</p>
              <p className="text-2xl font-bold text-blue-800">{formattedCompletionRate}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <div className="rounded-full bg-amber-100 p-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-700">Phase Completion Rate</p>
              <p className="text-2xl font-bold text-amber-800">{stats.phaseCompletionRate || "0%"}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
