import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { 
  Calendar, 
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Palmtree,
  Thermometer,
  Briefcase,
  Settings
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_LEAVE_TYPES = [
  { name: 'Vacation', code: 'VAC', color: '#22C55E', is_paid: true },
  { name: 'Sick Leave', code: 'SICK', color: '#EF4444', is_paid: true },
  { name: 'Personal', code: 'PER', color: '#3B82F6', is_paid: true },
  { name: 'Unpaid Leave', code: 'UNP', color: '#6B7280', is_paid: false },
];

export function LeaveManagementPanel() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);

  // Form states
  const [requestForm, setRequestForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees-for-leave', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('shop_id', shopId);
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch leave types
  const { data: leaveTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['leave-types', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await supabase
        .from('leave_types')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch leave requests
  const { data: leaveRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['leave-requests', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch leave balances
  const { data: leaveBalances } = useQuery({
    queryKey: ['leave-balances', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const currentYear = new Date().getFullYear();
      const { data } = await supabase
        .from('employee_leave_balances')
        .select('*')
        .eq('shop_id', shopId)
        .eq('year', currentYear);
      return data || [];
    },
    enabled: !!shopId,
  });

  // Setup default leave types
  const setupLeaveTypesMutation = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop selected');

      const typesToCreate = DEFAULT_LEAVE_TYPES.map(type => ({
        shop_id: shopId,
        name: type.name,
        code: type.code,
        color: type.color,
        is_paid: type.is_paid,
        accrual_rate: type.is_paid ? 0.0417 : 0, // ~1 hour per 24 hours worked
        accrual_period: 'monthly',
        max_balance: type.is_paid ? 80 : null,
        requires_approval: true,
      }));

      const { error } = await supabase
        .from('leave_types')
        .insert(typesToCreate);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      toast({ title: 'Success', description: 'Leave types created' });
      setShowSetupDialog(false);
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to create leave types', variant: 'destructive' });
    },
  });

  // Create leave request
  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop selected');

      const startDate = new Date(requestForm.start_date);
      const endDate = new Date(requestForm.end_date);
      const days = differenceInDays(endDate, startDate) + 1;
      const totalHours = days * 8; // Assuming 8 hour work days

      const { error } = await supabase
        .from('leave_requests')
        .insert({
          shop_id: shopId,
          employee_id: requestForm.employee_id,
          leave_type_id: requestForm.leave_type_id,
          start_date: requestForm.start_date,
          end_date: requestForm.end_date,
          total_hours: totalHours,
          reason: requestForm.reason || null,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({ title: 'Success', description: 'Leave request submitted' });
      setShowRequestDialog(false);
      setRequestForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to create request', variant: 'destructive' });
    },
  });

  // Approve/Reject request
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          approved_by: status === 'approved' ? userData.user?.id : null,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
          rejection_reason: rejection_reason || null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({ title: 'Success', description: 'Request updated' });
    },
  });

  // Helper functions
  const getEmployeeName = (id: string) => {
    const emp = employees?.find((e: any) => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown';
  };

  const getLeaveTypeName = (id: string) => {
    const type = leaveTypes?.find((t: any) => t.id === id);
    return type?.name || 'Unknown';
  };

  const getLeaveTypeColor = (id: string) => {
    const type = leaveTypes?.find((t: any) => t.id === id);
    return type?.color || '#6B7280';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingRequests = leaveRequests?.filter((r: any) => r.status === 'pending') || [];
  const processedRequests = leaveRequests?.filter((r: any) => r.status !== 'pending') || [];

  if (typesLoading || requestsLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  // Show setup if no leave types exist
  if (!leaveTypes || leaveTypes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Set Up Leave Types
          </CardTitle>
          <CardDescription>
            Configure leave types before managing PTO and leave requests
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            No leave types configured. Click below to set up default leave types (Vacation, Sick, Personal, Unpaid).
          </p>
          <Button onClick={() => setupLeaveTypesMutation.mutate()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Default Leave Types
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Leave Management</h2>
          <p className="text-muted-foreground">Track and manage employee time off requests</p>
        </div>
        <Button onClick={() => setShowRequestDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Leave Type Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {leaveTypes.map((type: any) => {
          const Icon = type.code === 'VAC' ? Palmtree :
                       type.code === 'SICK' ? Thermometer :
                       type.code === 'PER' ? Briefcase : Clock;
          return (
            <Card key={type.id}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4" style={{ color: type.color }} />
                  <span className="font-medium">{type.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {type.is_paid ? 'Paid Leave' : 'Unpaid'}
                  {type.max_balance && ` • Max ${type.max_balance}h`}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 bg-yellow-500">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
        </TabsList>

        {/* Pending Requests */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-1 h-12 rounded-full" 
                          style={{ backgroundColor: getLeaveTypeColor(request.leave_type_id) }}
                        />
                        <div>
                          <p className="font-medium">{getEmployeeName(request.employee_id)}</p>
                          <p className="text-sm text-muted-foreground">
                            {getLeaveTypeName(request.leave_type_id)} • {request.total_hours}h
                          </p>
                          <p className="text-sm">
                            {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-muted-foreground italic mt-1">"{request.reason}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600"
                          onClick={() => updateRequestMutation.mutate({ id: request.id, status: 'rejected' })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => updateRequestMutation.mutate({ id: request.id, status: 'approved' })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Requests */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {leaveRequests && leaveRequests.length > 0 ? (
                <div className="space-y-2">
                  {leaveRequests.map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-1 h-10 rounded-full" 
                          style={{ backgroundColor: getLeaveTypeColor(request.leave_type_id) }}
                        />
                        <div>
                          <p className="font-medium">{getEmployeeName(request.employee_id)}</p>
                          <p className="text-sm text-muted-foreground">
                            {getLeaveTypeName(request.leave_type_id)} • {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{request.total_hours}h</span>
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No leave requests</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balances */}
        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle>Employee Leave Balances</CardTitle>
              <CardDescription>Current year balances for all employees</CardDescription>
            </CardHeader>
            <CardContent>
              {employees && employees.length > 0 ? (
                <div className="space-y-4">
                  {employees.map((emp: any) => {
                    const empBalances = leaveBalances?.filter((b: any) => b.employee_id === emp.id) || [];
                    return (
                      <div key={emp.id} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                        </div>
                        <div className="grid gap-2 md:grid-cols-4">
                          {leaveTypes.map((type: any) => {
                            const balance = empBalances.find((b: any) => b.leave_type_id === type.id);
                            const available = balance?.balance_hours || 0;
                            const used = balance?.used_hours || 0;
                            const max = type.max_balance || 80;
                            const percent = Math.min(100, (available / max) * 100);
                            
                            return (
                              <div key={type.id} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span style={{ color: type.color }}>{type.name}</span>
                                  <span>{available}h</span>
                                </div>
                                <Progress value={percent} className="h-2" />
                                <p className="text-xs text-muted-foreground">
                                  {used}h used
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No employees found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
            <DialogDescription>Submit a new time off request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select 
                value={requestForm.employee_id} 
                onValueChange={(v) => setRequestForm(f => ({ ...f, employee_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select 
                value={requestForm.leave_type_id} 
                onValueChange={(v) => setRequestForm(f => ({ ...f, leave_type_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes?.map((type: any) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={requestForm.start_date}
                  onChange={(e) => setRequestForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={requestForm.end_date}
                  onChange={(e) => setRequestForm(f => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea 
                value={requestForm.reason}
                onChange={(e) => setRequestForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Reason for leave..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => createRequestMutation.mutate()}
              disabled={!requestForm.employee_id || !requestForm.leave_type_id || !requestForm.start_date || !requestForm.end_date}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
