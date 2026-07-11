import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, AlertTriangle, CheckCircle2, Clock, Award, Plus, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, format } from 'date-fns';

export default function EmployeeCertDashboard() {
  const { shopId } = useShopId();
  const navigate = useNavigate();

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ['septic-employees-dash', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_employees')
        .select('id, first_name, last_name, status')
        .eq('shop_id', shopId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: allCerts = [], isLoading: certsLoading } = useQuery({
    queryKey: ['septic-all-certs', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_employee_certifications')
        .select('*, septic_certification_types(name, category), septic_employees!inner(id, first_name, last_name, shop_id)')
        .eq('septic_employees.shop_id', shopId)
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const isLoading = empLoading || certsLoading;

  const expired = allCerts.filter((c: any) => c.expiry_date && differenceInDays(new Date(c.expiry_date), new Date()) < 0);
  const expiringSoon = allCerts.filter((c: any) => {
    if (!c.expiry_date) return false;
    const days = differenceInDays(new Date(c.expiry_date), new Date());
    return days >= 0 && days <= 30;
  });
  const valid = allCerts.filter((c: any) => {
    if (!c.expiry_date) return true;
    return differenceInDays(new Date(c.expiry_date), new Date()) > 30;
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => navigate('/septic/staff')} variant="outline">
          <ExternalLink className="h-4 w-4 mr-1" />View All Employees
        </Button>
        <Button size="sm" onClick={() => navigate('/septic/staff')} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" />Add Employee
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-1 text-emerald-600" />
            <p className="text-2xl font-bold">{employees.length}</p>
            <p className="text-xs text-muted-foreground">Active Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold text-red-600">{expired.length}</p>
            <p className="text-xs text-muted-foreground">Expired</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold text-amber-600">{expiringSoon.length}</p>
            <p className="text-xs text-muted-foreground">Expiring ≤30d</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{valid.length}</p>
            <p className="text-xs text-muted-foreground">Valid</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(expired.length > 0 || expiringSoon.length > 0) && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Attention Required</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[...expired, ...expiringSoon].slice(0, 10).map((cert: any) => {
              const emp = cert.septic_employees as any;
              const certType = cert.septic_certification_types as any;
              const days = cert.expiry_date ? differenceInDays(new Date(cert.expiry_date), new Date()) : null;
              const isExpired = days !== null && days < 0;
              return (
                <div key={cert.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                  <div>
                    <span className="font-medium">{emp?.first_name} {emp?.last_name}</span>
                    <span className="text-muted-foreground ml-2">— {certType?.name}</span>
                  </div>
                  <Badge className={isExpired ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}>
                    {isExpired ? `Expired ${Math.abs(days!)}d ago` : `${days}d left`}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {allCerts.length === 0 && (
        <Card><CardContent className="p-8 text-center">
          <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No certifications recorded yet. Add certifications from each employee's detail page.</p>
        </CardContent></Card>
      )}
    </div>
  );
}
