
import React, { useState } from 'react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { WorkOrderJobLine } from '@/types/jobLine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Package, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { AddPartButton } from './AddPartButton';
import { EnhancedPartRow } from './EnhancedPartRow';
import { EditPartDialog } from './EditPartDialog';
import { partStatusMap } from '@/types/workOrderPart';
import { toast } from 'sonner';
import { updateWorkOrderPart } from '@/services/workOrder/workOrderPartsService';

interface ComprehensivePartsTableProps {
  workOrderId: string;
  parts: WorkOrderPart[];
  jobLines: WorkOrderJobLine[];
  onPartsChange: () => Promise<void>;
  isEditMode?: boolean;
}

export function ComprehensivePartsTable({
  workOrderId,
  parts,
  jobLines,
  onPartsChange,
  isEditMode = false
}: ComprehensivePartsTableProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingPart, setEditingPart] = useState<WorkOrderPart | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handlePartEdit = (part: WorkOrderPart) => {
    setEditingPart(part);
    setIsEditDialogOpen(true);
  };

  const handleSavePart = async (partId: string, updates: Partial<WorkOrderPart>) => {
    try {
      setIsProcessing(true);
      await updateWorkOrderPart(partId, updates);
      toast.success('Part updated successfully');
      await onPartsChange();
      setIsEditDialogOpen(false);
      setEditingPart(null);
    } catch (error) {
      console.error('Error updating part:', error);
      toast.error('Failed to update part');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePartDelete = async (partId: string) => {
    try {
      setIsProcessing(true);
      const { deleteWorkOrderPart } = await import('@/services/workOrder/workOrderPartsService');
      await deleteWorkOrderPart(partId);
      toast.success('Part deleted successfully');
      await onPartsChange();
    } catch (error) {
      console.error('Error deleting part:', error);
      toast.error('Failed to delete part');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePartAdded = async () => {
    await onPartsChange();
  };

  const getJobLineName = (jobLineId?: string) => {
    if (!jobLineId) return 'Unassigned';
    const jobLine = jobLines.find(jl => jl.id === jobLineId);
    return jobLine?.name || 'Unknown Job Line';
  };

  const totalPartsValue = parts.reduce((sum, part) => sum + (part.total_price || 0), 0);
  const partsByStatus = parts.reduce((acc, part) => {
    const status = part.status || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (parts.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>Parts & Materials</CardTitle>
          </div>
          {isEditMode && (
            <AddPartButton
              workOrderId={workOrderId}
              jobLines={jobLines}
              onPartAdded={handlePartAdded}
              isEditMode={isEditMode}
              disabled={isProcessing}
            />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No parts added yet</p>
            <p className="text-sm">
              {isEditMode ? 'Click "Add Part" to get started' : 'No parts assigned to this work order'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <CardTitle>Parts & Materials</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>({parts.length} items • ${totalPartsValue.toFixed(2)})</span>
          </div>
        </div>
        {isEditMode && (
          <AddPartButton
            workOrderId={workOrderId}
            jobLines={jobLines}
            onPartAdded={handlePartAdded}
            isEditMode={isEditMode}
            disabled={isProcessing}
          />
        )}
      </CardHeader>
      
      <CardContent>
        {/* Status Summary */}
        {Object.keys(partsByStatus).length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
            {Object.entries(partsByStatus).map(([status, count]) => {
              const statusInfo = partStatusMap[status] || { label: status, classes: 'bg-gray-100 text-gray-800' };
              return (
                <Badge key={status} className={`${statusInfo.classes} text-xs`}>
                  {statusInfo.label}: {count}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Parts Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Details</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-24">Unit Price</TableHead>
                <TableHead className="w-24">Total</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-32">Supplier</TableHead>
                <TableHead className="w-24">Job Line</TableHead>
                {isEditMode && <TableHead className="w-20">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part) => (
                <EnhancedPartRow
                  key={part.id}
                  part={part}
                  onEdit={handlePartEdit}
                  onDelete={handlePartDelete}
                  isEditMode={isEditMode}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary Footer */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Total Parts: {parts.length}
            </div>
            <div className="text-lg font-semibold">
              Total Value: ${totalPartsValue.toFixed(2)}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Edit Part Dialog */}
      <EditPartDialog
        part={editingPart}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingPart(null);
        }}
        onSave={handleSavePart}
        isLoading={isProcessing}
      />
    </Card>
  );
}
