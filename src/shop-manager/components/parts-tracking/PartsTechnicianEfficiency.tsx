import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

interface TechnicianEfficiency {
  technicianName: string;
  workOrdersCompleted: number;
  totalHours: number;
  avgHoursPerOrder: number;
}

export function PartsTechnicianEfficiency() {
  const [technicians, setTechnicians] = useState<TechnicianEfficiency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTechnicianData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id')
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();

        if (!profile?.shop_id) return;

        const { data: workOrders } = await supabase
          .from('work_orders')
          .select(`
            id,
            status,
            start_time,
            end_time,
            technician_id,
            technician:profiles!work_orders_technician_id_fkey(full_name)
          `)
          .eq('shop_id', profile.shop_id)
          .eq('status', 'completed')
          .not('technician_id', 'is', null);

        if (workOrders) {
          const techMap = workOrders.reduce((acc, order) => {
            const techName = (order.technician as any)?.full_name || 'Unassigned';
            if (!acc[techName]) {
              acc[techName] = {
                technicianName: techName,
                workOrdersCompleted: 0,
                totalHours: 0,
              };
            }
            acc[techName].workOrdersCompleted += 1;
            
            // Calculate hours if start_time and end_time exist
            if (order.start_time && order.end_time) {
              const hours = (new Date(order.end_time).getTime() - new Date(order.start_time).getTime()) / (1000 * 60 * 60);
              acc[techName].totalHours += hours;
            }
            return acc;
          }, {} as Record<string, any>);

          const techData = Object.values(techMap).map((tech: any) => ({
            ...tech,
            avgHoursPerOrder: tech.workOrdersCompleted > 0 
              ? Math.round((tech.totalHours / tech.workOrdersCompleted) * 10) / 10
              : 0,
          }));

          setTechnicians(techData);
        }
      } catch (error) {
        console.error('Error fetching technician data:', error);
      }
      setIsLoading(false);
    };

    fetchTechnicianData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Technician Efficiency Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Technician Efficiency Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No technician data available. Complete work orders with assigned technicians to see efficiency metrics.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Technician Efficiency Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {technicians.map((tech, index) => (
              <div key={index} className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{tech.technicianName}</p>
                    <p className="text-sm text-muted-foreground">
                      {tech.workOrdersCompleted} work orders completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {tech.avgHoursPerOrder}h avg per order
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(tech.totalHours)}h total
                    </p>
                  </div>
                </div>
                <Progress 
                  value={Math.min((tech.workOrdersCompleted / Math.max(...technicians.map(t => t.workOrdersCompleted))) * 100, 100)} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
