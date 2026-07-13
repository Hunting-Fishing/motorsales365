
import React from "react";
import { Badge } from "@/components/ui/badge";
import { UserPlus, RefreshCw, UserX, Edit, Shield } from "lucide-react";

interface ActionBadgeProps {
  actionType: string;
}

export const ActionBadge = ({ actionType }: ActionBadgeProps) => {
  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'creation':
        return "bg-green-100 text-green-800 hover:bg-green-200/50";
      case 'update':
        return "bg-blue-100 text-blue-800 hover:bg-blue-200/50";
      case 'role_change':
        return "bg-purple-100 text-purple-800 hover:bg-purple-200/50";
      case 'status_change':
        return "bg-amber-100 text-amber-800 hover:bg-amber-200/50";
      case 'deletion':
        return "bg-red-100 text-red-800 hover:bg-red-200/50";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200/50";
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'creation':
        return <UserPlus className="h-4 w-4 mr-1" />;
      case 'update':
        return <Edit className="h-4 w-4 mr-1" />;
      case 'role_change':
        return <Shield className="h-4 w-4 mr-1" />;
      case 'status_change':
        return <RefreshCw className="h-4 w-4 mr-1" />;
      case 'deletion':
        return <UserX className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <Badge className={`flex items-center ${getActionColor(actionType)}`}>
      {getActionIcon(actionType)}
      {formatActionType(actionType)}
    </Badge>
  );
};
