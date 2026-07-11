
import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InteractionType } from "@/types/interaction";
import { MessageSquare, Wrench, Package, Calendar, ClipboardList } from "lucide-react";

interface InteractionTypeBadgeProps {
  type: InteractionType;
}

export const InteractionTypeBadge: React.FC<InteractionTypeBadgeProps> = ({ type }) => {
  const getTypeConfig = (type: InteractionType) => {
    switch (type) {
      case "communication":
        return { label: "Communication", classes: "bg-blue-100 text-blue-800", icon: MessageSquare };
      case "work_order":
        return { label: "Work Order", classes: "bg-indigo-100 text-indigo-800", icon: Wrench };
      case "parts":
        return { label: "Parts", classes: "bg-amber-100 text-amber-800", icon: Package };
      case "service":
        return { label: "Service", classes: "bg-green-100 text-green-800", icon: ClipboardList };
      case "follow_up":
        return { label: "Follow-up", classes: "bg-purple-100 text-purple-800", icon: Calendar };
      default:
        return { label: "Other", classes: "bg-slate-100 text-slate-800", icon: MessageSquare };
    }
  };

  const config = getTypeConfig(type);
  const Icon = config.icon;

  return (
    <Badge className={cn("flex items-center gap-1", config.classes)}>
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </Badge>
  );
};
