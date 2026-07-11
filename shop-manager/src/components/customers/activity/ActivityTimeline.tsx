import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  FileText, 
  Wrench, 
  User,
  Calendar,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Customer, CustomerNote } from "@/types/customer";
import { WorkOrder } from "@/types/workOrder";
import { CustomerInteraction } from "@/types/interaction";
import { CustomerCommunication } from "@/types/customer/notes";

interface ActivityTimelineProps {
  customer: Customer;
  workOrders: WorkOrder[];
  interactions: CustomerInteraction[];
  communications: CustomerCommunication[];
  notes: CustomerNote[];
}

interface ActivityItem {
  id: string;
  type: 'work_order' | 'interaction' | 'communication' | 'note';
  title: string;
  description: string;
  date: string;
  icon: React.ReactNode;
  status?: string;
  metadata?: any;
}

const getIconForType = (type: string, subtype?: string) => {
  switch (type) {
    case 'work_order':
      return <Wrench className="h-4 w-4" />;
    case 'interaction':
      return <User className="h-4 w-4" />;
    case 'communication':
      switch (subtype) {
        case 'email':
          return <Mail className="h-4 w-4" />;
        case 'phone':
        case 'text':
          return <Phone className="h-4 w-4" />;
        default:
          return <MessageSquare className="h-4 w-4" />;
      }
    case 'note':
      return <FileText className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'closed':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
    case 'in progress':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  customer,
  workOrders,
  interactions,
  communications,
  notes
}) => {
  const activities: ActivityItem[] = React.useMemo(() => {
    const items: ActivityItem[] = [];

    // Add work orders
    workOrders.forEach(wo => {
      items.push({
        id: `wo-${wo.id}`,
        type: 'work_order',
        title: `Work Order #${wo.id}`,
        description: wo.description || 'Work order created',
        date: wo.created_at,
        icon: getIconForType('work_order'),
        status: wo.status,
        metadata: { total: wo.total_cost }
      });
    });

    // Add interactions
    interactions.forEach(interaction => {
      items.push({
        id: `int-${interaction.id}`,
        type: 'interaction',
        title: `${interaction.type} - ${interaction.description}`,
        description: interaction.notes || 'Customer interaction recorded',
        date: interaction.date,
        icon: getIconForType('interaction'),
        status: interaction.status,
        metadata: { staff: interaction.staff_member_name }
      });
    });

    // Add communications
    communications.forEach(comm => {
      items.push({
        id: `comm-${comm.id}`,
        type: 'communication',
        title: comm.subject || `${comm.type} ${comm.direction}`,
        description: comm.content.substring(0, 100) + (comm.content.length > 100 ? '...' : ''),
        date: comm.date,
        icon: getIconForType('communication', comm.type),
        status: comm.status,
        metadata: { staff: comm.staff_member_name, type: comm.type }
      });
    });

    // Add notes
    notes.forEach(note => {
      items.push({
        id: `note-${note.id}`,
        type: 'note',
        title: `Note - ${note.category}`,
        description: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
        date: note.created_at,
        icon: getIconForType('note'),
        metadata: { category: note.category }
      });
    });

    // Sort by date descending
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workOrders, interactions, communications, notes]);

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
          <p className="text-gray-500">
            Customer activity will appear here as interactions, work orders, and communications are recorded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Recent Activity</h3>
      
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <Card key={activity.id} className="relative">
            {index < activities.length - 1 && (
              <div className="absolute left-6 top-12 bottom-0 w-px bg-gray-200" />
            )}
            
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    {activity.icon}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </h4>
                      {activity.status && (
                        <Badge variant="outline" className={getStatusColor(activity.status)}>
                          {activity.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    <time className="text-xs text-gray-500">
                      {new Date(activity.date).toLocaleDateString()}
                    </time>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.description}
                  </p>
                  
                  {activity.metadata && (
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      {activity.metadata.staff && (
                        <span>by {activity.metadata.staff}</span>
                      )}
                      {activity.metadata.total && (
                        <span>${activity.metadata.total}</span>
                      )}
                      {activity.metadata.category && (
                        <Badge variant="secondary" className="text-xs">
                          {activity.metadata.category}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};