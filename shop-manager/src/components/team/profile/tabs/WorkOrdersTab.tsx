
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Wrench, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useTeamMemberWorkOrders } from "@/hooks/team/useTeamMemberWorkOrders";
import { format } from "date-fns";

interface WorkOrdersTabProps {
  memberId: string;
}

export function WorkOrdersTab({ memberId }: WorkOrdersTabProps) {
  const { workOrders, maintenanceRequests, stats, isLoading, error } = useTeamMemberWorkOrders(memberId);

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
      assigned: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      in_progress: "bg-purple-500/10 text-purple-700 border-purple-500/20",
      completed: "bg-green-500/10 text-green-700 border-green-500/20",
      cancelled: "bg-red-500/10 text-red-700 border-red-500/20"
    };

    return (
      <Badge variant="outline" className={statusColors[status] || "bg-muted"}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors: Record<string, string> = {
      low: "bg-slate-500/10 text-slate-700 border-slate-500/20",
      medium: "bg-orange-500/10 text-orange-700 border-orange-500/20",
      high: "bg-red-500/10 text-red-700 border-red-500/20",
      urgent: "bg-red-600 text-white border-red-600"
    };

    return (
      <Badge variant="outline" className={priorityColors[priority] || "bg-muted"}>
        {priority}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-4" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
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
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Assigned</p>
                <p className="text-3xl font-bold text-blue-600">{stats.assigned}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">In Progress</p>
                <p className="text-3xl font-bold text-purple-600">{stats.inProgress}</p>
              </div>
              <Wrench className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Orders List */}
      {workOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Work Orders</CardTitle>
            <CardDescription>Work orders assigned to this team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workOrders.map(wo => (
                <div key={wo.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">{wo.title}</h4>
                      {wo.equipment_name && (
                        <p className="text-sm text-muted-foreground mb-1">
                          <span className="font-medium">Equipment:</span> {wo.equipment_name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">Customer:</span> {wo.customer_name}
                      </p>
                      {wo.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{wo.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(wo.status)}
                      {getPriorityBadge(wo.priority)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                    <span>Created: {format(new Date(wo.created_at), 'MMM d, yyyy')}</span>
                    {wo.due_date && (
                      <>
                        <span>•</span>
                        <span>Due: {format(new Date(wo.due_date), 'MMM d, yyyy')}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Requests */}
      {maintenanceRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Requests</CardTitle>
            <CardDescription>Requests created, assigned to, or completed by this team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {maintenanceRequests.map(mr => (
                <div key={mr.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">{mr.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {mr.type === 'requested' ? 'Requested' : mr.type === 'assigned' ? 'Assigned' : 'Completed'}
                        </Badge>
                      </div>
                      {mr.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{mr.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(mr.status)}
                      {getPriorityBadge(mr.priority)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">
                    {format(new Date(mr.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {workOrders.length === 0 && maintenanceRequests.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Work Orders</h3>
            <p className="text-muted-foreground">
              This team member has no work orders or maintenance requests yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
