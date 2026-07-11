import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Phone, Mail, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function SepticDrivers() {
  const navigate = useNavigate();
  const { shopId } = useShopId();

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['septic-employees-drivers', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_employees')
        .select('id, first_name, last_name, phone, email, status, septic_employee_roles!inner(role)')
        .eq('shop_id', shopId)
        .eq('septic_employee_roles.role', 'driver')
        .order('last_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const statusColor = (s: string) =>
    s === 'active'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <Button onClick={() => navigate('/septic/staff')} className="bg-gradient-to-r from-stone-600 to-stone-800">
          <Plus className="h-4 w-4 mr-2" />Add Employee as Driver
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : drivers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No employees with the Driver role found.</p>
            <Button onClick={() => navigate('/septic/staff')} variant="outline">Go to Employees</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {drivers.map((d: any) => (
            <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/septic/staff/${d.id}`)}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{d.first_name} {d.last_name}</span>
                    <Badge className={statusColor(d.status)}>{d.status}</Badge>
                    <Badge variant="outline" className="text-xs">Driver</Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {d.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{d.phone}</span>}
                    {d.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{d.email}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
