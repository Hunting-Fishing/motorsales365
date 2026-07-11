
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Clock, FileText, User, Users, AlertCircle, Package, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTeamMemberActivity } from "@/hooks/team/useTeamMemberActivity";
import { format } from "date-fns";

interface ActivityTabProps {
  memberId: string;
}

export function ActivityTab({ memberId }: ActivityTabProps) {
  const { activities, isLoading, error } = useTeamMemberActivity(memberId);

  // Helper function to get the appropriate icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "work_order":
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case "customer":
        return <Users className="h-4 w-4 text-green-600" />;
      case "maintenance_request":
        return <FileText className="h-4 w-4 text-purple-600" />;
      case "part_request":
        return <Package className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Helper function to get the badge for activity action
  const getActivityBadge = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes("created")) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">Created</Badge>;
    } else if (actionLower.includes("updated") || actionLower.includes("modified")) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">Updated</Badge>;
    } else if (actionLower.includes("viewed") || actionLower.includes("accessed")) {
      return <Badge variant="outline" className="bg-slate-500/10 text-slate-700 border-slate-500/20">Viewed</Badge>;
    } else if (actionLower.includes("completed") || actionLower.includes("finished")) {
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/20">Completed</Badge>;
    } else if (actionLower.includes("deleted") || actionLower.includes("removed")) {
      return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">Deleted</Badge>;
    } else {
      return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Recent actions and updates performed by this team member
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className={`flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0 ${
                  activity.flagged ? 'bg-red-50 -mx-4 px-4 py-3 rounded-lg' : ''
                }`}
              >
                <div className={`rounded-full p-2 ${
                  activity.flagged ? 'bg-red-100' : 'bg-muted'
                }`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-foreground">{activity.description}</p>
                    {getActivityBadge(activity.action)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                  </div>
                  {activity.flagged && activity.flag_reason && (
                    <div className="mt-2 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{activity.flag_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Activity Yet</h3>
            <p className="text-muted-foreground">
              This team member hasn't performed any tracked actions yet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
