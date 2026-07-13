import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, Calendar, User, CheckCircle2, AlertTriangle, XCircle, 
  Eye, Ship, FileText 
} from 'lucide-react';
import { useVesselInspectionHistory, VesselInspectionRecord } from '@/hooks/useVesselInspectionHistory';
import { format } from 'date-fns';

interface VesselInspectionHistoryProps {
  vesselId?: string;
}

const STATUS_CONFIG = {
  pass: { icon: CheckCircle2, label: 'Pass', className: 'bg-green-100 text-green-700 border-green-200' },
  attention: { icon: AlertTriangle, label: 'Attention', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  fail: { icon: XCircle, label: 'Fail', className: 'bg-red-100 text-red-700 border-red-200' },
  pending: { icon: Clock, label: 'Pending', className: 'bg-gray-100 text-gray-700 border-gray-200' }
};

export function VesselInspectionHistory({ vesselId }: VesselInspectionHistoryProps) {
  const { inspections, isLoading, fetchInspectionDetails } = useVesselInspectionHistory(vesselId);
  const [selectedInspection, setSelectedInspection] = useState<VesselInspectionRecord | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const handleViewDetails = async (inspectionId: string) => {
    setDetailsLoading(true);
    try {
      const details = await fetchInspectionDetails(inspectionId);
      setSelectedInspection(details);
    } catch (error) {
      console.error('Error fetching inspection details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Inspection History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inspections && inspections.length > 0 ? (
            <div className="space-y-3">
              {inspections.map(inspection => {
                const statusConfig = STATUS_CONFIG[inspection.overall_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;

                return (
                  <div 
                    key={inspection.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${statusConfig.className}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Ship className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {inspection.vessel?.name || 'Unknown Vessel'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(inspection.inspection_date), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {inspection.inspector_name}
                          </span>
                          {inspection.current_hours && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {inspection.current_hours}h
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={inspection.safe_to_operate ? 'default' : 'destructive'}>
                        {inspection.safe_to_operate ? 'Safe' : 'Unsafe'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDetails(inspection.id)}
                        disabled={detailsLoading}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No inspection history found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspection Details Dialog */}
      <Dialog open={!!selectedInspection} onOpenChange={() => setSelectedInspection(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Inspection Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedInspection && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Vessel</p>
                    <p className="font-medium">{selectedInspection.vessel?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Inspector</p>
                    <p className="font-medium">{selectedInspection.inspector_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {format(new Date(selectedInspection.inspection_date), 'MMMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hours</p>
                    <p className="font-medium">{selectedInspection.current_hours || 'N/A'}</p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex gap-2">
                  <Badge className={STATUS_CONFIG[selectedInspection.overall_status as keyof typeof STATUS_CONFIG]?.className}>
                    {STATUS_CONFIG[selectedInspection.overall_status as keyof typeof STATUS_CONFIG]?.label || 'Unknown'}
                  </Badge>
                  <Badge variant={selectedInspection.safe_to_operate ? 'default' : 'destructive'}>
                    {selectedInspection.safe_to_operate ? 'Safe to Operate' : 'Unsafe'}
                  </Badge>
                </div>

                {/* Notes */}
                {selectedInspection.general_notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">General Notes</p>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      {selectedInspection.general_notes}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Inspection Items */}
                {selectedInspection.items && selectedInspection.items.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Inspection Items</p>
                    <div className="space-y-2">
                      {selectedInspection.items.map(item => {
                        const itemStatus = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
                        const ItemIcon = itemStatus?.icon || Clock;

                        return (
                          <div 
                            key={item.id} 
                            className="flex items-start justify-between p-3 border rounded"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{item.item_name}</span>
                                {item.equipment?.name && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.equipment.name}
                                  </Badge>
                                )}
                              </div>
                              {item.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                              )}
                            </div>
                            <Badge className={itemStatus?.className || ''}>
                              <ItemIcon className="h-3 w-3 mr-1" />
                              {item.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
