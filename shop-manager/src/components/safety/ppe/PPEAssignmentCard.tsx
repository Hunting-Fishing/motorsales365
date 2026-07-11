import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { PPEAssignment } from '@/hooks/usePPEManagement';

interface PPEAssignmentCardProps {
  assignment: PPEAssignment;
  onClick?: () => void;
}

export const PPEAssignmentCard = ({ assignment, onClick }: PPEAssignmentCardProps) => {
  const employeeName = assignment.profiles 
    ? `${assignment.profiles.first_name || ''} ${assignment.profiles.last_name || ''}`.trim() || assignment.profiles.email
    : 'Unknown';
  
  const itemName = assignment.ppe_inventory?.name || 'Unknown Item';
  const isExpired = assignment.expiry_date && isPast(new Date(assignment.expiry_date));
  const isExpiringSoon = assignment.expiry_date && 
    !isExpired && 
    differenceInDays(new Date(assignment.expiry_date), new Date()) <= 30;
  const needsInspection = assignment.next_inspection_date && 
    isPast(new Date(assignment.next_inspection_date));

  const getStatusBadge = () => {
    switch (assignment.status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>;
      case 'returned':
        return <Badge variant="secondary">Returned</Badge>;
      case 'lost':
        return <Badge variant="destructive">Lost</Badge>;
      case 'damaged':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200">Damaged</Badge>;
      default:
        return <Badge variant="outline">{assignment.status}</Badge>;
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">{itemName}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {employeeName}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Assigned: {format(new Date(assignment.assigned_date), 'MMM d, yyyy')}
            </div>
          </div>
          <div className="text-right space-y-1">
            {getStatusBadge()}
            <p className="text-sm text-muted-foreground">Qty: {assignment.quantity}</p>
          </div>
        </div>

        {(isExpired || isExpiringSoon || needsInspection) && (
          <div className="mt-3 space-y-1">
            {isExpired && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertTriangle className="h-3 w-3" />
                Expired: {format(new Date(assignment.expiry_date!), 'MMM d, yyyy')}
              </div>
            )}
            {isExpiringSoon && !isExpired && (
              <div className="flex items-center gap-1 text-orange-500 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Expires: {format(new Date(assignment.expiry_date!), 'MMM d, yyyy')}
              </div>
            )}
            {needsInspection && (
              <div className="flex items-center gap-1 text-orange-500 text-xs">
                <CheckCircle className="h-3 w-3" />
                Inspection overdue
              </div>
            )}
          </div>
        )}

        {assignment.serial_number && (
          <p className="mt-2 text-xs text-muted-foreground">
            S/N: {assignment.serial_number}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
