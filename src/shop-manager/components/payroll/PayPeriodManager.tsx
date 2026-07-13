import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePayPeriods } from '@/hooks/usePayPeriods';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { format } from 'date-fns';
import { 
  Calendar, 
  Plus, 
  CheckCircle,
  Clock,
  DollarSign,
  Users
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CreatePayPeriodDialog } from './CreatePayPeriodDialog';
import { useToast } from '@/hooks/use-toast';

export function PayPeriodManager() {
  const { shopId } = useShopId();
  const { payPeriods, loading, refetch } = usePayPeriods();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Get time cards for each pay period
  const { data: periodStats } = useQuery({
    queryKey: ['pay-period-stats', shopId],
    queryFn: async () => {
      if (!shopId) return {};
      
      const { data: timeCards } = await supabase
        .from('time_card_entries')
        .select('*')
        .eq('shop_id', shopId);
      
      const stats: Record<string, any> = {};
      
      payPeriods.forEach(period => {
        const periodCards = (timeCards || []).filter(tc => {
          const clockIn = new Date(tc.clock_in_time);
          return clockIn >= new Date(period.start_date) && 
                 clockIn <= new Date(period.end_date);
        });
        
        stats[period.id] = {
          totalHours: periodCards.reduce((sum, tc) => sum + (tc.total_hours || 0), 0),
          totalPay: periodCards.reduce((sum, tc) => sum + (tc.total_pay || 0), 0),
          employeeCount: new Set(periodCards.map(tc => tc.employee_id)).size,
          cardCount: periodCards.length,
          approvedCount: periodCards.filter(tc => tc.status === 'approved').length,
        };
      });
      
      return stats;
    },
    enabled: !!shopId && payPeriods.length > 0,
  });

  const handleProcessPayroll = async (periodId: string) => {
    try {
      const { error } = await supabase
        .from('pay_periods')
        .update({ status: 'processing' })
        .eq('id', periodId);
      
      if (error) throw error;
      
      toast({
        title: 'Processing',
        description: 'Payroll is being processed',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process payroll',
        variant: 'destructive',
      });
    }
  };

  const handleMarkPaid = async (periodId: string) => {
    try {
      const { error } = await supabase
        .from('pay_periods')
        .update({ status: 'paid' })
        .eq('id', periodId);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Pay period marked as paid',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update pay period',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'processing': return 'secondary';
      case 'paid': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pay Periods</h2>
          <p className="text-muted-foreground">Manage payroll cycles</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Pay Period
        </Button>
      </div>

      {/* Pay Periods List */}
      <div className="space-y-4">
        {payPeriods.map((period) => {
          const stats = periodStats?.[period.id] || {};
          
          return (
            <Card key={period.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {period.period_name || 'Pay Period'}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(period.start_date), 'MMM d')} - {format(new Date(period.end_date), 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusColor(period.status)}>
                    {period.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4 mb-4">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-lg font-bold">{stats.totalHours?.toFixed(1) || 0}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Pay</p>
                      <p className="text-lg font-bold">${stats.totalPay?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Employees</p>
                      <p className="text-lg font-bold">{stats.employeeCount || 0}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <CheckCircle className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Approved</p>
                      <p className="text-lg font-bold">
                        {stats.approvedCount || 0} / {stats.cardCount || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  {period.status === 'open' && (
                    <Button 
                      variant="outline"
                      onClick={() => handleProcessPayroll(period.id)}
                    >
                      Process Payroll
                    </Button>
                  )}
                  {period.status === 'processing' && (
                    <Button onClick={() => handleMarkPaid(period.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {payPeriods.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pay Periods</h3>
              <p className="text-muted-foreground mb-4">
                Create your first pay period to start tracking payroll
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Pay Period
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreatePayPeriodDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={() => {
          setCreateDialogOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
