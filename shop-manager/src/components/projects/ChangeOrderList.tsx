import { useState } from 'react';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProjectDetails } from '@/hooks/useProjectBudgets';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import type { ProjectChangeOrder } from '@/types/projectBudget';

interface ChangeOrderListProps {
  changeOrders: ProjectChangeOrder[];
  projectId: string;
}

export function ChangeOrderList({ changeOrders, projectId }: ChangeOrderListProps) {
  const { approveChangeOrder, rejectChangeOrder } = useProjectDetails(projectId);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (id: string) => {
    await approveChangeOrder.mutateAsync(id);
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    await rejectChangeOrder.mutateAsync({ id: rejectingId, reason: rejectionReason });
    setRejectingId(null);
    setRejectionReason('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>;
    }
  };

  if (changeOrders.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No change orders. Create a change order to request budget amendments.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {changeOrders.map((co) => (
        <Card key={co.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(co.status)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{co.change_order_number}</span>
                    {getStatusBadge(co.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Requested {format(new Date(co.requested_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${co.amount_change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {co.amount_change >= 0 ? '+' : ''}{formatCurrency(co.amount_change)}
                </div>
                {co.status === 'pending' && (
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(co.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => setRejectingId(co.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium">Reason</h4>
                <p className="text-sm text-muted-foreground">{co.reason}</p>
              </div>
              
              {co.description && (
                <div>
                  <h4 className="text-sm font-medium">Description</h4>
                  <p className="text-sm text-muted-foreground">{co.description}</p>
                </div>
              )}

              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Original Budget: </span>
                  <span className="font-medium">{formatCurrency(co.original_budget || 0)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">New Budget: </span>
                  <span className="font-medium">{formatCurrency(co.new_budget || 0)}</span>
                </div>
              </div>

              {co.rejection_reason && (
                <div className="p-3 bg-destructive/10 rounded-md">
                  <h4 className="text-sm font-medium text-destructive">Rejection Reason</h4>
                  <p className="text-sm text-destructive/80">{co.rejection_reason}</p>
                </div>
              )}

              {co.approved_at && co.status !== 'pending' && (
                <p className="text-xs text-muted-foreground">
                  {co.status === 'approved' ? 'Approved' : 'Rejected'} on {format(new Date(co.approved_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!rejectingId} onOpenChange={() => setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Change Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this change order.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
