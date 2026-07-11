import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  User,
  Edit,
  Save,
  X
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function EmployeeRatesPanel() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editRate, setEditRate] = useState('');
  const [editOvertimeMultiplier, setEditOvertimeMultiplier] = useState('1.5');

  // Fetch employees
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees-list', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('shop_id', shopId);
      
      return profiles || [];
    },
    enabled: !!shopId,
  });

  // Fetch time card entries to get hourly rates (most recent per employee)
  const { data: employeeRates } = useQuery({
    queryKey: ['employee-rates-from-timecards', shopId],
    queryFn: async () => {
      if (!shopId) return {};
      
      // Get the most recent time card with hourly rate for each employee
      const { data } = await supabase
        .from('time_card_entries')
        .select('employee_id, hourly_rate')
        .eq('shop_id', shopId)
        .not('hourly_rate', 'is', null)
        .order('created_at', { ascending: false });
      
      const rates: Record<string, number> = {};
      (data || []).forEach((tc: any) => {
        if (tc.employee_id && tc.hourly_rate && !rates[tc.employee_id]) {
          rates[tc.employee_id] = tc.hourly_rate;
        }
      });
      
      return rates;
    },
    enabled: !!shopId,
  });

  // Store rate by creating a time card entry template (or we could use localStorage/company_settings)
  const saveRateMutation = useMutation({
    mutationFn: async ({ employeeId, hourlyRate }: { employeeId: string; hourlyRate: number }) => {
      // For now, store in localStorage as a quick solution
      // In production, you'd want a dedicated employee_rates table
      const ratesKey = `employee_rates_${shopId}`;
      const existingRates = JSON.parse(localStorage.getItem(ratesKey) || '{}');
      existingRates[employeeId] = {
        hourly_rate: hourlyRate,
        overtime_multiplier: parseFloat(editOvertimeMultiplier) || 1.5,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(ratesKey, JSON.stringify(existingRates));
      return existingRates[employeeId];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-rates-local'] });
      toast({
        title: 'Rate Updated',
        description: 'Employee rate has been saved and will apply to future time cards.',
      });
      setEditingEmployee(null);
    },
    onError: (error) => {
      console.error('Error saving rate:', error);
      toast({
        title: 'Error',
        description: 'Failed to save employee rate',
        variant: 'destructive',
      });
    },
  });

  // Get locally stored rates
  const { data: localRates } = useQuery({
    queryKey: ['employee-rates-local', shopId],
    queryFn: () => {
      const ratesKey = `employee_rates_${shopId}`;
      return JSON.parse(localStorage.getItem(ratesKey) || '{}');
    },
    enabled: !!shopId,
  });

  const handleEditClick = (employeeId: string) => {
    setEditingEmployee(employeeId);
    const localRate = localRates?.[employeeId];
    const tcRate = employeeRates?.[employeeId];
    setEditRate(localRate?.hourly_rate?.toString() || tcRate?.toString() || '');
    setEditOvertimeMultiplier(localRate?.overtime_multiplier?.toString() || '1.5');
  };

  const handleSave = async (employeeId: string) => {
    const hourlyRate = parseFloat(editRate);
    
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
      toast({
        title: 'Invalid Rate',
        description: 'Please enter a valid hourly rate',
        variant: 'destructive',
      });
      return;
    }
    
    saveRateMutation.mutate({ employeeId, hourlyRate });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Employee Hourly Rates
        </CardTitle>
        <CardDescription>
          Manage hourly pay rates for each employee. Changes apply to future time cards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {employees?.map((employee: any) => {
            const localRate = localRates?.[employee.id];
            const tcRate = employeeRates?.[employee.id];
            const displayRate = localRate?.hourly_rate || tcRate;
            const overtimeMultiplier = localRate?.overtime_multiplier || 1.5;
            
            return (
              <div 
                key={employee.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {employee.job_title || 'Employee'}
                    </p>
                  </div>
                </div>

                {editingEmployee === employee.id ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Rate"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">/hr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">OT:</span>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="1.5"
                        value={editOvertimeMultiplier}
                        onChange={(e) => setEditOvertimeMultiplier(e.target.value)}
                        className="w-16"
                      />
                      <span className="text-sm text-muted-foreground">x</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSave(employee.id)}
                      disabled={saveRateMutation.isPending}
                    >
                      <Save className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingEmployee(null)}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {displayRate ? (
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          ${displayRate.toFixed(2)}/hr
                        </p>
                        <p className="text-xs text-muted-foreground">
                          OT: {overtimeMultiplier}x
                        </p>
                      </div>
                    ) : (
                      <Badge variant="outline">No rate set</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(employee.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {(!employees || employees.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No employees found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
