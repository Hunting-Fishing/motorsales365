import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeftRight, Check, X, Clock } from 'lucide-react';
import { useShiftSwaps } from '@/hooks/useShiftSwaps';
import { useScheduling } from '@/hooks/useScheduling';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export function ShiftSwapManager() {
  const { swapRequests, createSwapRequest, approveSwapRequest, rejectSwapRequest, loading } = useShiftSwaps();
  const { schedules } = useScheduling();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [formData, setFormData] = useState({
    original_schedule_id: '',
    target_employee_id: '',
    swap_date: '',
    reason: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await createSwapRequest({
        ...formData,
        requesting_employee_id: user?.id,
        target_employee_id: formData.target_employee_id || null
      });
      setDialogOpen(false);
      setFormData({
        original_schedule_id: '',
        target_employee_id: '',
        swap_date: '',
        reason: ''
      });
    } catch (error) {
      console.error('Error creating swap request:', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      await approveSwapRequest(selectedRequest.id, reviewNotes);
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error approving swap:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await rejectSwapRequest(selectedRequest.id, reviewNotes);
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error rejecting swap:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      cancelled: 'outline'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Shift Swap Requests
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Request Shift Swap</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Shift Swap</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="schedule">Your Shift *</Label>
                  <select
                    id="schedule"
                    className="w-full p-2 border rounded-md"
                    value={formData.original_schedule_id}
                    onChange={(e) => setFormData({ ...formData, original_schedule_id: e.target.value })}
                    required
                  >
                    <option value="">Select a shift</option>
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.schedule_name} - {schedule.shift_start} to {schedule.shift_end}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="swap_date">Swap Date *</Label>
                  <Input
                    id="swap_date"
                    type="date"
                    value={formData.swap_date}
                    onChange={(e) => setFormData({ ...formData, swap_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Why do you need to swap this shift?"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Submit Request</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : swapRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No shift swap requests
          </div>
        ) : (
          <div className="space-y-3">
            {swapRequests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(new Date(request.swap_date), 'MMMM d, yyyy')}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-muted-foreground">Requesting: </span>
                        {request.requesting_employee?.first_name} {request.requesting_employee?.last_name}
                      </div>
                      {request.target_employee && (
                        <div>
                          <span className="text-muted-foreground">With: </span>
                          {request.target_employee.first_name} {request.target_employee.last_name}
                        </div>
                      )}
                      {request.reason && (
                        <div className="text-muted-foreground italic">
                          "{request.reason}"
                        </div>
                      )}
                      {request.review_notes && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          <span className="font-semibold">Review: </span>
                          {request.review_notes}
                        </div>
                      )}
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setReviewDialogOpen(true);
                        }}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Shift Swap Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="review_notes">Review Notes (Optional)</Label>
                <Textarea
                  id="review_notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this decision..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReviewDialogOpen(false);
                    setReviewNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button onClick={handleApprove}>
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
