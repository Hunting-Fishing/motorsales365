import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

interface Dispute {
  id: string;
  time_card_id: string;
  employee_id: string;
  employee_name?: string;
  dispute_type: string;
  original_value: string | null;
  requested_value: string | null;
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewer_name?: string;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  time_card?: {
    clock_in_time: string;
    clock_out_time: string;
  };
}

const DISPUTE_TYPES = [
  { value: 'hours', label: 'Total Hours' },
  { value: 'clock_in', label: 'Clock In Time' },
  { value: 'clock_out', label: 'Clock Out Time' },
  { value: 'break', label: 'Break Time' },
  { value: 'other', label: 'Other' },
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: <Clock className="h-4 w-4" /> },
  under_review: { label: 'Under Review', variant: 'outline', icon: <MessageSquare className="h-4 w-4" /> },
  approved: { label: 'Approved', variant: 'default', icon: <CheckCircle className="h-4 w-4" /> },
  denied: { label: 'Denied', variant: 'destructive', icon: <XCircle className="h-4 w-4" /> },
};

export function TimeCardDisputesPanel() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { shopId } = useShopId();
  const { toast } = useToast();

  useEffect(() => {
    if (shopId) {
      fetchDisputes();
    }
  }, [shopId, filterStatus]);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('time_card_disputes')
        .select(`
          *,
          time_card:time_card_entries(clock_in_time, clock_out_time)
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch employee names
      const employeeIds = [...new Set(data?.map(d => d.employee_id) || [])];
      const reviewerIds = [...new Set(data?.map(d => d.reviewed_by).filter(Boolean) || [])];
      const allIds = [...new Set([...employeeIds, ...reviewerIds])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', allIds);

      const profileMap = new Map(profiles?.map(p => [
        p.id,
        p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.email || 'Unknown'
      ]));

      setDisputes((data || []).map(d => ({
        ...d,
        employee_name: profileMap.get(d.employee_id) || 'Unknown',
        reviewer_name: d.reviewed_by ? profileMap.get(d.reviewed_by) : undefined,
      })));
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast({ title: 'Error', description: 'Failed to load disputes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setResolutionNotes(dispute.resolution_notes || '');
  };

  const updateDisputeStatus = async (status: 'approved' | 'denied' | 'under_review') => {
    if (!selectedDispute) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('time_card_disputes')
        .update({
          status,
          reviewed_by: userData.user?.id,
          reviewed_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq('id', selectedDispute.id);

      if (error) throw error;

      // If approved, update the time card
      if (status === 'approved' && selectedDispute.requested_value) {
        const updateData: Record<string, string> = {};
        if (selectedDispute.dispute_type === 'clock_in') {
          updateData.clock_in_time = selectedDispute.requested_value;
        } else if (selectedDispute.dispute_type === 'clock_out') {
          updateData.clock_out_time = selectedDispute.requested_value;
        }

        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('time_card_entries')
            .update(updateData)
            .eq('id', selectedDispute.time_card_id);
        }
      }

      // Log to audit
      await supabase.from('payroll_audit_log').insert({
        shop_id: shopId,
        entity_type: 'dispute',
        entity_id: selectedDispute.id,
        action: status,
        old_values: { status: selectedDispute.status },
        new_values: { status, resolution_notes: resolutionNotes },
        changed_by: userData.user?.id,
      });

      toast({ title: 'Success', description: `Dispute ${status}` });
      setSelectedDispute(null);
      fetchDisputes();
    } catch (error) {
      console.error('Error updating dispute:', error);
      toast({ title: 'Error', description: 'Failed to update dispute', variant: 'destructive' });
    }
  };

  const pendingCount = disputes.filter(d => d.status === 'pending').length;

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading disputes...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Time Card Disputes
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount} pending</Badge>
          )}
        </CardTitle>
        <CardDescription>Review and resolve employee time card disputes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Original</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {disputes.map(dispute => (
              <TableRow key={dispute.id}>
                <TableCell className="font-medium">{dispute.employee_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {DISPUTE_TYPES.find(t => t.value === dispute.dispute_type)?.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{dispute.original_value || '-'}</TableCell>
                <TableCell className="text-primary font-medium">{dispute.requested_value || '-'}</TableCell>
                <TableCell className="max-w-xs truncate" title={dispute.reason}>{dispute.reason}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_CONFIG[dispute.status]?.variant || 'secondary'} className="flex items-center gap-1 w-fit">
                    {STATUS_CONFIG[dispute.status]?.icon}
                    {STATUS_CONFIG[dispute.status]?.label}
                  </Badge>
                </TableCell>
                <TableCell>{format(new Date(dispute.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => handleReview(dispute)}>
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {disputes.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No disputes found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Dispute</DialogTitle>
            </DialogHeader>
            {selectedDispute && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Employee</Label>
                    <p className="font-medium">{selectedDispute.employee_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Dispute Type</Label>
                    <p className="font-medium">
                      {DISPUTE_TYPES.find(t => t.value === selectedDispute.dispute_type)?.label}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Original Value</Label>
                    <p className="font-medium">{selectedDispute.original_value || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Requested Value</Label>
                    <p className="font-medium text-primary">{selectedDispute.requested_value || 'N/A'}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Reason for Dispute</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md">{selectedDispute.reason}</p>
                </div>

                {selectedDispute.time_card && (
                  <div className="p-3 bg-muted rounded-md text-sm">
                    <Label className="text-muted-foreground">Time Card Details</Label>
                    <p>Clock In: {format(new Date(selectedDispute.time_card.clock_in_time), 'PPp')}</p>
                    <p>Clock Out: {selectedDispute.time_card.clock_out_time 
                      ? format(new Date(selectedDispute.time_card.clock_out_time), 'PPp')
                      : 'Not clocked out'}</p>
                  </div>
                )}

                <div>
                  <Label>Resolution Notes</Label>
                  <Textarea
                    value={resolutionNotes}
                    onChange={e => setResolutionNotes(e.target.value)}
                    placeholder="Add notes about your decision..."
                    rows={3}
                  />
                </div>

                {selectedDispute.status === 'pending' || selectedDispute.status === 'under_review' ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => updateDisputeStatus('under_review')}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Mark Under Review
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => updateDisputeStatus('denied')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Deny
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => updateDisputeStatus('approved')}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm">
                      <strong>Reviewed by:</strong> {selectedDispute.reviewer_name}
                    </p>
                    <p className="text-sm">
                      <strong>Reviewed at:</strong> {selectedDispute.reviewed_at && format(new Date(selectedDispute.reviewed_at), 'PPp')}
                    </p>
                    {selectedDispute.resolution_notes && (
                      <p className="text-sm mt-2">
                        <strong>Notes:</strong> {selectedDispute.resolution_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
