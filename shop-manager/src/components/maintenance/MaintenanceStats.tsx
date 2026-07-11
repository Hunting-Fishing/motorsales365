
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface MaintenanceStatsProps {
  totalScheduled: number;
  totalOverdue: number;
  upcomingCount: number;
  completedCount: number;
}

export function MaintenanceStats({
  totalScheduled,
  totalOverdue,
  upcomingCount,
  completedCount
}: MaintenanceStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-full">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-sm font-medium text-blue-600">Scheduled</div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold">{totalScheduled}</div>
            <div className="text-sm text-muted-foreground">Total maintenance tasks</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-sm font-medium text-red-600">Overdue</div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-red-600">{totalOverdue}</div>
            <div className="text-sm text-muted-foreground">Needs immediate attention</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-sm font-medium text-yellow-600">Upcoming</div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold">{upcomingCount}</div>
            <div className="text-sm text-muted-foreground">Due within 30 days</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-sm font-medium text-green-600">Completed</div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold">{completedCount}</div>
            <div className="text-sm text-muted-foreground">Last 30 days</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
