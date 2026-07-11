import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Ship, CheckCircle, AlertTriangle, XCircle, Clock, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { InspectionPdfExport } from '@/components/safety/shared/InspectionPdfExport';

export default function VesselInspectionHistoryPage() {
  const { vesselId } = useParams<{ vesselId: string }>();
  const navigate = useNavigate();

  // Fetch vessel details
  const { data: vessel, isLoading: vesselLoading } = useQuery({
    queryKey: ['vessel-details', vesselId],
    queryFn: async () => {
      if (!vesselId) return null;
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('*')
        .eq('id', vesselId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!vesselId
  });

  // Fetch inspection history
  const { data: inspections, isLoading: inspectionsLoading } = useQuery({
    queryKey: ['vessel-inspection-history', vesselId],
    queryFn: async () => {
      if (!vesselId) return [];
      const { data, error } = await supabase
        .from('vessel_inspections')
        .select(`
          *,
          vessel_inspection_items (*)
        `)
        .eq('vessel_id', vesselId)
        .order('inspection_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!vesselId
  });

  const getStatusBadge = (inspection: any) => {
    if (!inspection.safe_to_operate) {
      return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Not Safe</Badge>;
    }
    if (inspection.has_concerns || inspection.overall_status === 'attention') {
      return <Badge variant="outline" className="text-amber-500 border-amber-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Concerns</Badge>;
    }
    if (inspection.overall_status === 'fail') {
      return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
    }
    return <Badge variant="outline" className="text-emerald-500 border-emerald-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Pass</Badge>;
  };

  const isLoading = vesselLoading || inspectionsLoading;

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ship className="h-6 w-6" />
            {vesselLoading ? <Skeleton className="h-6 w-48" /> : vessel?.name || 'Vessel'} - Inspection History
          </h1>
          <p className="text-muted-foreground">
            {vessel?.asset_number && `Asset #${vessel.asset_number}`}
            {vessel?.current_hours && ` • ${vessel.current_hours} hours`}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Button onClick={() => navigate(`/safety/vessels?equipmentId=${vesselId}`)}>
              <FileText className="h-4 w-4 mr-2" />
              New Inspection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inspection List */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Records</CardTitle>
          <CardDescription>
            {inspections?.length || 0} inspections on record
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : inspections?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ship className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No inspections recorded yet</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate(`/safety/vessels?equipmentId=${vesselId}`)}
              >
                Create First Inspection
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {inspections?.map((inspection: any) => {
                const itemsCount = inspection.vessel_inspection_items?.length || 0;
                const concernItems = inspection.vessel_inspection_items?.filter(
                  (i: any) => i.status === 'attention' || i.status === 'bad'
                ) || [];

                return (
                  <div
                    key={inspection.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(inspection.inspection_date), 'MMMM d, yyyy h:mm a')}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <User className="h-3 w-3" />
                          {inspection.inspector_name}
                          {inspection.current_hours && (
                            <span className="ml-2">• {inspection.current_hours} hrs</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(inspection)}
                        <InspectionPdfExport
                          inspectionId={inspection.id}
                          inspectionDate={inspection.inspection_date}
                          inspectorName={inspection.inspector_name}
                          vesselName={vessel?.name || 'Vessel'}
                          overallStatus={inspection.overall_status || 'pass'}
                          safeToOperate={inspection.safe_to_operate}
                          currentHours={inspection.current_hours}
                          generalNotes={inspection.general_notes}
                          signatureData={inspection.signature_data}
                          items={inspection.vessel_inspection_items?.map((item: any) => ({
                            itemName: item.item_name,
                            category: item.category || 'General',
                            status: item.status,
                            notes: item.notes || ''
                          })) || []}
                        />
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {itemsCount} items checked
                      </span>
                      {concernItems.length > 0 && (
                        <Badge variant="secondary" className="text-amber-600">
                          {concernItems.length} concern{concernItems.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    {/* Concern Items */}
                    {concernItems.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Issues Found:</p>
                        <div className="flex flex-wrap gap-2">
                          {concernItems.slice(0, 5).map((item: any) => (
                            <Badge 
                              key={item.id} 
                              variant="outline"
                              className={item.status === 'bad' ? 'border-red-500 text-red-600' : 'border-amber-500 text-amber-600'}
                            >
                              {item.item_name}
                            </Badge>
                          ))}
                          {concernItems.length > 5 && (
                            <Badge variant="outline">+{concernItems.length - 5} more</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {inspection.general_notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Notes:</p>
                        <p className="text-sm">{inspection.general_notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
