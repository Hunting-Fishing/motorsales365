
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PhaseProgressItem } from "@/types/dashboard";
import { Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface WorkOrderPhaseProgressProps {
  data: PhaseProgressItem[];
  isLoading: boolean;
}

export function WorkOrderPhaseProgress({ data, isLoading }: WorkOrderPhaseProgressProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Multi-Phase Work Orders Progress</CardTitle>
          <CardDescription>Status of complex work orders with multiple phases</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Multi-Phase Work Orders Progress</CardTitle>
          <CardDescription>Status of complex work orders with multiple phases</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">No multi-phase work orders found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-Phase Work Orders Progress</CardTitle>
        <CardDescription>Status of complex work orders with multiple phases</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((item) => (
          <Link 
            key={item.id} 
            to={`/work-orders/${item.id}`}
            className="block space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium truncate group-hover:text-primary transition-colors flex items-center gap-2">
                {item.name}
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
              <span className="text-sm text-muted-foreground">
                {item.completedPhases} / {item.totalPhases} phases
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={item.progress} className="h-2" />
              <span className="text-sm font-medium">{item.progress}%</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
