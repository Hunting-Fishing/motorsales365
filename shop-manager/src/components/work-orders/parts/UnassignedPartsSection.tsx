
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, AlertCircle } from 'lucide-react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { SpecialOrderDialog } from '../shared/SpecialOrderDialog';

interface UnassignedPartsSectionProps {
  workOrderId: string;
  parts: WorkOrderPart[];
  onPartsChange: () => void;
  isEditMode?: boolean;
}

export function UnassignedPartsSection({
  workOrderId,
  parts,
  onPartsChange,
  isEditMode = false
}: UnassignedPartsSectionProps) {
  const [showSpecialOrderDialog, setShowSpecialOrderDialog] = useState(false);

  const unassignedParts = parts.filter(part => !part.job_line_id);

  const handlePartAdded = () => {
    onPartsChange();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <CardTitle className="text-base">Unassigned Parts</CardTitle>
            {unassignedParts.length > 0 && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {unassignedParts.length} unassigned
              </Badge>
            )}
          </div>
          {isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSpecialOrderDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Part
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {unassignedParts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No unassigned parts</p>
            <p className="text-sm">All parts are assigned to specific job lines</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unassignedParts.map((part) => (
              <div key={part.id} className="p-3 border rounded-lg bg-yellow-50/50 border-yellow-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <h4 className="font-medium text-gray-900">{part.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600">
                      {part.part_number} | Qty: {part.quantity}
                    </p>
                    {part.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {part.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        Status: {part.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Type: {part.part_type || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ${((part.unit_price || 0) * part.quantity).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      ${(part.unit_price || 0).toFixed(2)} each
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <SpecialOrderDialog
        open={showSpecialOrderDialog}
        onOpenChange={setShowSpecialOrderDialog}
        workOrderId={workOrderId}
        onPartAdded={handlePartAdded}
      />
    </Card>
  );
}
