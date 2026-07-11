
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Wrench, Package, Clock, DollarSign } from 'lucide-react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { SpecialOrderDialog } from './SpecialOrderDialog';

interface JobLineWithPartsProps {
  jobLine: WorkOrderJobLine;
  parts: WorkOrderPart[];
  workOrderId: string;
  onPartAdded: () => void;
  isEditMode?: boolean;
}

export function JobLineWithParts({
  jobLine,
  parts,
  workOrderId,
  onPartAdded,
  isEditMode = false
}: JobLineWithPartsProps) {
  const [showSpecialOrderDialog, setShowSpecialOrderDialog] = useState(false);

  const handlePartAdded = () => {
    onPartAdded();
  };

  const totalPartsValue = parts.reduce((sum, part) => sum + part.total_price, 0);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wrench className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{jobLine.name}</CardTitle>
              {jobLine.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {jobLine.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {jobLine.estimated_hours || 0}h
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="h-4 w-4" />
                ${(jobLine.total_amount || 0).toFixed(2)}
              </div>
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
        </div>
      </CardHeader>
      
      {parts.length > 0 && (
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Parts ({parts.length})
              </span>
              <Badge variant="outline" className="ml-auto">
                ${totalPartsValue.toFixed(2)}
              </Badge>
            </div>
            
            {parts.map((part) => (
              <div key={part.id} className="p-3 border rounded-lg bg-gray-50/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{part.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {part.status}
                      </Badge>
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
                        Type: {part.part_type || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ${part.total_price.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      ${(part.unit_price || 0).toFixed(2)} each
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}

      <SpecialOrderDialog
        open={showSpecialOrderDialog}
        onOpenChange={setShowSpecialOrderDialog}
        workOrderId={workOrderId}
        jobLineId={jobLine.id}
        onPartAdded={handlePartAdded}
      />
    </Card>
  );
}
