import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { PPEHistory } from '@/hooks/usePPEManagement';
import { 
  Package, 
  PlayCircle, 
  StopCircle, 
  RotateCcw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench
} from 'lucide-react';

interface PPEHistoryCardProps {
  history: PPEHistory;
}

const eventTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  assigned: { label: 'Assigned', icon: Package, color: 'bg-blue-500' },
  put_in_service: { label: 'Put In Service', icon: PlayCircle, color: 'bg-green-500' },
  out_of_service: { label: 'Out of Service', icon: StopCircle, color: 'bg-red-500' },
  returned: { label: 'Returned', icon: RotateCcw, color: 'bg-orange-500' },
  expired: { label: 'Expired', icon: AlertTriangle, color: 'bg-destructive' },
  damaged: { label: 'Damaged', icon: AlertTriangle, color: 'bg-yellow-500' },
  lost: { label: 'Lost', icon: AlertTriangle, color: 'bg-red-600' },
  inspected: { label: 'Inspected', icon: CheckCircle, color: 'bg-primary' },
  repaired: { label: 'Repaired', icon: Wrench, color: 'bg-purple-500' },
  condition_updated: { label: 'Condition Updated', icon: Clock, color: 'bg-muted' },
  status_changed: { label: 'Status Changed', icon: Clock, color: 'bg-muted' },
  updated: { label: 'Updated', icon: Clock, color: 'bg-muted' },
};

export const PPEHistoryCard = ({ history }: PPEHistoryCardProps) => {
  const config = eventTypeConfig[history.event_type] || eventTypeConfig.updated;
  const Icon = config.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${config.color} text-white`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline">{config.label}</Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(history.event_date), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            
            {history.ppe_inventory && (
              <p className="font-medium mt-1 truncate">
                {history.ppe_inventory.name}
              </p>
            )}
            
            {history.performed_by_name && (
              <p className="text-sm text-muted-foreground">
                By: {history.performed_by_name}
              </p>
            )}
            
            {(history.previous_status || history.new_status) && (
              <p className="text-sm text-muted-foreground mt-1">
                {history.previous_status && <span>{history.previous_status}</span>}
                {history.previous_status && history.new_status && ' → '}
                {history.new_status && <span className="font-medium">{history.new_status}</span>}
              </p>
            )}
            
            {(history.condition_before || history.condition_after) && (
              <p className="text-sm text-muted-foreground">
                Condition: {history.condition_before || 'N/A'} → {history.condition_after || 'N/A'}
              </p>
            )}
            
            {history.notes && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {history.notes}
              </p>
            )}
            
            {history.metadata?.expiry_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Expiry: {format(new Date(history.metadata.expiry_date), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
