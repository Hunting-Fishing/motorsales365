import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Ship, Forklift, Truck, ClipboardCheck, Plus, ExternalLink, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export function EquipmentInspectionsTab() {
  const navigate = useNavigate();

  // Fetch recent vessel inspections
  const { data: vesselInspections, isLoading: vesselLoading } = useQuery({
    queryKey: ['all-vessel-inspections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_inspections')
        .select(`
          *,
          vessel:equipment_assets!vessel_id (
            name,
            asset_number
          )
        `)
        .order('inspection_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch recent forklift inspections
  const { data: forkliftInspections, isLoading: forkliftLoading } = useQuery({
    queryKey: ['all-forklift-inspections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forklift_inspections')
        .select(`
          *,
          equipment:equipment_assets!equipment_id (
            name,
            asset_number
          )
        `)
        .order('inspection_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    }
  });

  const getStatusBadge = (inspection: any) => {
    const isSafe = inspection.safe_to_operate ?? true;
    const hasConcerns = inspection.has_concerns ?? false;
    
    if (!isSafe) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Not Safe</Badge>;
    }
    if (hasConcerns) {
      return <Badge variant="outline" className="text-amber-500 border-amber-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Concerns</Badge>;
    }
    return <Badge variant="outline" className="text-emerald-500 border-emerald-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Pass</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Start New Inspection
          </CardTitle>
          <CardDescription>
            Run a safety inspection for equipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20"
              onClick={() => navigate('/safety/vessels')}
            >
              <Ship className="h-8 w-8 text-cyan-500" />
              <span className="font-medium">Vessel Inspection</span>
              <span className="text-xs text-muted-foreground">Marine pre-trip check</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20"
              onClick={() => navigate('/safety/equipment/forklift')}
            >
              <Forklift className="h-8 w-8 text-orange-500" />
              <span className="font-medium">Forklift Inspection</span>
              <span className="text-xs text-muted-foreground">Daily safety check</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20"
              onClick={() => navigate('/safety/dvir/new')}
            >
              <Truck className="h-8 w-8 text-blue-500" />
              <span className="font-medium">DVIR Report</span>
              <span className="text-xs text-muted-foreground">Vehicle inspection</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Vessel Inspections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-cyan-500" />
              Vessel Inspections
            </CardTitle>
            <CardDescription>Recent marine vessel inspections</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/safety/vessels')}>
            View All
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </CardHeader>
        <CardContent>
          {vesselLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (vesselInspections?.length || 0) === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Ship className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No vessel inspections recorded yet</p>
              <Button variant="link" onClick={() => navigate('/safety/vessels')}>
                Start first inspection
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {vesselInspections?.slice(0, 5).map((inspection: any) => (
                <div
                  key={inspection.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Ship className="h-5 w-5 text-cyan-500" />
                    <div>
                      <div className="font-medium text-sm">
                        {inspection.vessel?.name || 'Unknown Vessel'}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(inspection.inspection_date), 'MMM d, yyyy h:mm a')}
                        <span>•</span>
                        {inspection.inspector_name}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(inspection)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Forklift Inspections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Forklift className="h-5 w-5 text-orange-500" />
              Forklift Inspections
            </CardTitle>
            <CardDescription>Recent forklift safety checks</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/safety/equipment/forklift')}>
            View All
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </CardHeader>
        <CardContent>
          {forkliftLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (forkliftInspections?.length || 0) === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Forklift className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No forklift inspections recorded yet</p>
              <Button variant="link" onClick={() => navigate('/safety/equipment/forklift')}>
                Start first inspection
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {forkliftInspections?.slice(0, 5).map((inspection: any) => (
                <div
                  key={inspection.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Forklift className="h-5 w-5 text-orange-500" />
                    <div>
                      <div className="font-medium text-sm">
                        {inspection.equipment?.name || 'Unknown Equipment'}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(inspection.inspection_date), 'MMM d, yyyy h:mm a')}
                        <span>•</span>
                        {inspection.inspector_name}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(inspection)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
