
import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InteractionStatus } from "@/types/interaction";

interface InteractionStatusBadgeProps {
  status: InteractionStatus;
}

export const InteractionStatusBadge: React.FC<InteractionStatusBadgeProps> = ({ status }) => {
  const getStatusConfig = (status: InteractionStatus) => {
    switch (status) {
      case "pending":
        return { label: "Pending", classes: "bg-yellow-100 text-yellow-800" };
      case "in_progress":
        return { label: "In Progress", classes: "bg-blue-100 text-blue-800" };
      case "completed":
        return { label: "Completed", classes: "bg-green-100 text-green-800" };
      case "cancelled":
        return { label: "Cancelled", classes: "bg-red-100 text-red-800" };
      default:
        return { label: "Unknown", classes: "bg-slate-100 text-slate-800" };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge className={cn(config.classes)}>
      {config.label}
    </Badge>
  );
};
