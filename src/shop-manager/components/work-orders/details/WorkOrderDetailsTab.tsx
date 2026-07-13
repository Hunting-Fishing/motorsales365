
import React, { useEffect, useState } from 'react';
import { WorkOrder } from '@/types/workOrder';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getWorkOrderParts } from '@/services/workOrder/workOrderPartsService';
import { updateWorkOrderJobLine, deleteWorkOrderJobLine } from '@/services/workOrder/jobLinesService';
import { updateWorkOrderPart, deleteWorkOrderPart } from '@/services/workOrder/workOrderPartsService';
import { UnifiedItemsTable } from '../shared/UnifiedItemsTable';
import { toast } from '@/hooks/use-toast';

interface WorkOrderDetailsTabProps {
  workOrder: WorkOrder;
  jobLines: WorkOrderJobLine[];
  allParts: WorkOrderPart[];
  onJobLinesChange: (jobLines: WorkOrderJobLine[]) => void;
  isEditMode: boolean;
}

export function WorkOrderDetailsTab({
  workOrder,
  jobLines,
  allParts: initialParts,
  onJobLinesChange,
  isEditMode,
}: WorkOrderDetailsTabProps) {
  const [allParts, setAllParts] = useState<WorkOrderPart[]>(initialParts);
  const [partsLoading, setPartsLoading] = useState(false);

  useEffect(() => {
    const fetchParts = async () => {
      if (workOrder.id) {
        try {
          setPartsLoading(true);
          const parts = await getWorkOrderParts(workOrder.id);
          setAllParts(parts);
        } catch (error) {
          console.error('Error fetching work order parts:', error);
          setAllParts([]);
        } finally {
          setPartsLoading(false);
        }
      }
    };

    fetchParts();
  }, [workOrder.id]);

  const handleJobLineUpdate = async (updatedJobLine: WorkOrderJobLine) => {
    try {
      console.log('Updating job line:', updatedJobLine);
      
      // Update in database
      await updateWorkOrderJobLine(updatedJobLine.id, updatedJobLine);
      
      // Update local state
      const updatedJobLines = jobLines.map(line => 
        line.id === updatedJobLine.id ? updatedJobLine : line
      );
      onJobLinesChange(updatedJobLines);
      
      toast({
        title: "Success",
        description: "Job line updated successfully",
      });
    } catch (error) {
      console.error('Error updating job line:', error);
      toast({
        title: "Error", 
        description: "Failed to update job line",
        variant: "destructive"
      });
    }
  };

  const handleJobLineDelete = async (jobLineId: string) => {
    try {
      console.log('Deleting job line:', jobLineId);
      
      // Delete from database
      await deleteWorkOrderJobLine(jobLineId);
      
      // Update local state
      const updatedJobLines = jobLines.filter(line => line.id !== jobLineId);
      onJobLinesChange(updatedJobLines);
      
      toast({
        title: "Success",
        description: "Job line deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting job line:', error);
      toast({
        title: "Error",
        description: "Failed to delete job line", 
        variant: "destructive"
      });
    }
  };

  const handlePartUpdate = async (updatedPart: WorkOrderPart) => {
    try {
      console.log('Updating part:', updatedPart);
      
      // Update in database
      await updateWorkOrderPart(updatedPart.id, updatedPart);
      
      // Update local state
      const updatedParts = allParts.map(part => 
        part.id === updatedPart.id ? updatedPart : part
      );
      setAllParts(updatedParts);
      
      toast({
        title: "Success",
        description: "Part updated successfully",
      });
    } catch (error) {
      console.error('Error updating part:', error);
      toast({
        title: "Error",
        description: "Failed to update part",
        variant: "destructive"
      });
    }
  };

  const handlePartDelete = async (partId: string) => {
    try {
      console.log('Deleting part:', partId);
      
      // Delete from database
      await deleteWorkOrderPart(partId);
      
      // Update local state
      const updatedParts = allParts.filter(part => part.id !== partId);
      setAllParts(updatedParts);
      
      toast({
        title: "Success", 
        description: "Part deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting part:', error);
      toast({
        title: "Error",
        description: "Failed to delete part",
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Vehicle Details - Compact */}
      {(workOrder.vehicle_license_plate || workOrder.vehicle_vin) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {workOrder.vehicle_license_plate && (
                <div>
                  <span className="text-muted-foreground">License Plate: </span>
                  <span className="font-medium">{workOrder.vehicle_license_plate}</span>
                </div>
              )}
              {workOrder.vehicle_vin && (
                <div>
                  <span className="text-muted-foreground">VIN: </span>
                  <span className="font-medium">{workOrder.vehicle_vin}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unified Labor & Parts Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Labor & Parts</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {partsLoading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Loading job lines and parts...
            </div>
          ) : (
            <UnifiedItemsTable
              jobLines={jobLines}
              allParts={allParts}
              onJobLineUpdate={isEditMode ? handleJobLineUpdate : undefined}
              onJobLineDelete={isEditMode ? handleJobLineDelete : undefined}
              onPartUpdate={isEditMode ? handlePartUpdate : undefined}
              onPartDelete={isEditMode ? handlePartDelete : undefined}
              isEditMode={isEditMode}
              showType="overview"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
