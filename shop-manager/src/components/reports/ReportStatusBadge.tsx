
import { Badge } from "@/components/ui/badge";

type ReportStatus = "live" | "refreshing" | "error" | "scheduled";

interface ReportStatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

export function ReportStatusBadge({ status, className }: ReportStatusBadgeProps) {
  const getVariant = () => {
    switch (status) {
      case "live":
        return "success" as const;
      case "refreshing":
        return "secondary" as const;
      case "error":
        return "destructive" as const;
      case "scheduled":
        return "outline" as const;
      default:
        return "default" as const;
    }
  };

  const getLabel = () => {
    switch (status) {
      case "live":
        return "Live Data";
      case "refreshing":
        return "Refreshing...";
      case "error":
        return "Data Error";
      case "scheduled":
        return "Scheduled";
      default:
        return status;
    }
  };

  return (
    <Badge variant={getVariant()} className={className}>
      {getLabel()}
    </Badge>
  );
}
