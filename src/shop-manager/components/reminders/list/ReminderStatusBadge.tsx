
import { ReminderStatus } from "@/types/reminder";
import { Badge } from "@/components/ui/badge";
import { format, isPast, parseISO } from "date-fns";

export interface ReminderStatusBadgeProps {
  status: ReminderStatus;
  dueDate?: string; // Optional due date property
}

export function ReminderStatusBadge({ status, dueDate }: ReminderStatusBadgeProps) {
  // Determine badge styling based on status and due date
  const getBadgeVariant = () => {
    // Check if reminder is overdue
    const isOverdue = dueDate && isPast(parseISO(dueDate)) && status === "pending";

    switch (status) {
      case "pending":
        return isOverdue 
          ? { variant: "outline", className: "border-red-500 text-red-500" }
          : { variant: "outline", className: "border-amber-500 text-amber-500" };
      case "sent":
        return { variant: "outline", className: "border-blue-500 text-blue-500" };
      case "completed":
        return { variant: "outline", className: "border-green-500 text-green-500" };
      case "cancelled":
        return { variant: "outline", className: "border-gray-500 text-gray-500" };
      default:
        return { variant: "outline", className: "" };
    }
  };

  const badgeStyle = getBadgeVariant();
  
  // Format the display text
  const getDisplayText = () => {
    let displayText = status.charAt(0).toUpperCase() + status.slice(1);
    
    // Add overdue indicator if applicable
    if (dueDate && isPast(parseISO(dueDate)) && status === "pending") {
      displayText = `${displayText} (Overdue)`;
    }
    
    return displayText;
  };
  
  return (
    <Badge variant={badgeStyle.variant as any} className={badgeStyle.className}>
      {getDisplayText()}
    </Badge>
  );
}
