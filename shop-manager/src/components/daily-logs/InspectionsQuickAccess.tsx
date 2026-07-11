import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Ship, Forklift, Truck, ClipboardCheck, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

export function InspectionsQuickAccess() {
  const navigate = useNavigate();
  const today = new Date();

  // Fetch today's inspections
  const { data: todayVesselInspections } = useQuery({
    queryKey: ['today-vessel-inspections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_inspections')
        .select('id, vessel_id, inspector_name, safe_to_operate, has_concerns')
        .gte('inspection_date', startOfDay(today).toISOString())
        .lte('inspection_date', endOfDay(today).toISOString());
      if (error) throw error;
      return data || [];
    }
  });

  const { data: todayForkliftInspections } = useQuery({
    queryKey: ['today-forklift-inspections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forklift_inspections')
        .select('id, equipment_id, inspector_name, safe_to_operate, has_concerns')
        .gte('inspection_date', startOfDay(today).toISOString())
        .lte('inspection_date', endOfDay(today).toISOString());
      if (error) throw error;
      return data || [];
    }
  });

  const { data: todayDVIR } = useQuery({
    queryKey: ['today-dvir'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dvir_reports')
        .select('id, vehicle_id, driver_name, defects_found')
        .gte('inspection_date', startOfDay(today).toISOString())
        .lte('inspection_date', endOfDay(today).toISOString());
      if (error) throw error;
      return data || [];
    }
  });

  const inspectionSummary = [
    {
      title: 'Vessel Inspections',
      icon: Ship,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      href: '/safety/vessels',
      count: todayVesselInspections?.length || 0,
      concerns: todayVesselInspections?.filter(i => i.has_concerns || !i.safe_to_operate).length || 0
    },
    {
      title: 'Forklift Inspections',
      icon: Forklift,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      href: '/safety/equipment/forklift',
      count: todayForkliftInspections?.length || 0,
      concerns: todayForkliftInspections?.filter(i => i.has_concerns || !i.safe_to_operate).length || 0
    },
    {
      title: 'DVIR Reports',
      icon: Truck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      href: '/safety/dvir/new',
      count: todayDVIR?.length || 0,
      concerns: todayDVIR?.filter(i => i.defects_found).length || 0
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Today's Inspections
        </CardTitle>
        <CardDescription>
          {format(today, 'EEEE, MMMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          {inspectionSummary.map((item) => (
            <div
              key={item.title}
              className={`p-3 rounded-lg ${item.bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => navigate(item.href)}
            >
              <div className="flex items-center justify-between mb-2">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                {item.concerns > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {item.concerns} issues
                  </Badge>
                )}
              </div>
              <div className="text-2xl font-bold">{item.count}</div>
              <div className="text-xs text-muted-foreground truncate">{item.title}</div>
            </div>
          ))}
        </div>

        {/* Quick Action Buttons */}
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground mb-3">Start a new inspection:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/safety/vessels')}
              className="flex items-center gap-2"
            >
              <Ship className="h-4 w-4 text-cyan-500" />
              Vessel
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/safety/equipment/forklift')}
              className="flex items-center gap-2"
            >
              <Forklift className="h-4 w-4 text-orange-500" />
              Forklift
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/safety/dvir/new')}
              className="flex items-center gap-2"
            >
              <Truck className="h-4 w-4 text-blue-500" />
              DVIR
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
