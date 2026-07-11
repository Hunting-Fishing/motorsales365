
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, Bell, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/context/notifications";

interface MaintenanceHeaderProps {
  totalScheduled: number;
  totalOverdue: number;
}

export function MaintenanceHeader({ totalScheduled, totalOverdue }: MaintenanceHeaderProps) {
  const { addNotification } = useNotifications();
  
  const handleNotificationTest = () => {
    addNotification({
      title: "Maintenance Alert",
      message: "This is a test maintenance notification",
      type: "info",
      category: "system"
    });
  };
  
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maintenance Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and track equipment maintenance schedules
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handleNotificationTest} title="Test maintenance notification">
          <Bell className="h-4 w-4 mr-2" />
          Test Alert
        </Button>
        <Button variant="outline" asChild>
          <Link to="/reports?type=maintenance">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Link>
        </Button>
        <Button asChild>
          <Link to="/equipment">
            <CalendarDays className="h-4 w-4 mr-2" />
            View Equipment
          </Link>
        </Button>
      </div>
    </div>
  );
}
