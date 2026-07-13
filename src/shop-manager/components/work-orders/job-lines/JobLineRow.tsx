
import React, { useState } from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { jobLineStatusMap } from '@/types/jobLine';

interface JobLineRowProps {
  jobLine: WorkOrderJobLine;
  associatedParts: WorkOrderPart[];
  isEditMode?: boolean;
  onEdit?: (jobLine: WorkOrderJobLine) => void;
  onDelete?: (jobLineId: string) => void;
  colorIndex?: number;
}

export function JobLineRow({ 
  jobLine, 
  associatedParts, 
  isEditMode = false,
  onEdit,
  onDelete,
  colorIndex
}: JobLineRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statusInfo = jobLineStatusMap[jobLine.status || 'pending'];
  const totalAmount = jobLine.total_amount || (jobLine.estimated_hours || 0) * (jobLine.labor_rate || 0);

  const handleEdit = () => {
    if (onEdit) onEdit(jobLine);
  };

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this job line?')) {
      onDelete(jobLine.id);
    }
  };

  return (
    <>
      <TableRow colorIndex={colorIndex}>
        <TableCell className="w-8">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </TableCell>
        
        <TableCell className="font-medium">
          <div className="flex flex-col">
            <span className="font-semibold">{jobLine.name}</span>
            {(jobLine.category || jobLine.subcategory) && (
              <div className="flex gap-1 mt-1">
                {jobLine.category && (
                  <Badge variant="outline" className="text-xs">
                    {jobLine.category}
                  </Badge>
                )}
                {jobLine.subcategory && (
                  <Badge variant="secondary" className="text-xs">
                    {jobLine.subcategory}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </TableCell>
        
        <TableCell className="text-center">
          {jobLine.estimated_hours || 0}h
        </TableCell>
        
        <TableCell className="text-center">
          <div className="flex flex-col">
            <span>${jobLine.labor_rate || 0}/hr</span>
            {jobLine.labor_rate_type && jobLine.labor_rate_type !== 'standard' && (
              <Badge variant="outline" className="text-xs mt-1">
                {jobLine.labor_rate_type}
              </Badge>
            )}
          </div>
        </TableCell>
        
        <TableCell className="text-right font-medium">
          ${totalAmount.toFixed(2)}
        </TableCell>
        
        <TableCell>
          <Badge 
            variant="outline" 
            className={statusInfo?.classes || 'bg-gray-100 text-gray-800'}
          >
            {statusInfo?.label || jobLine.status || 'pending'}
          </Badge>
        </TableCell>
        
        {isEditMode && (
          <TableCell>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>
      
      <TableRow>
        <TableCell colSpan={isEditMode ? 7 : 6} className="p-0">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent>
              <div className="p-4 bg-slate-50 border-t">
                {jobLine.description && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-1">Description:</h5>
                    <p className="text-sm text-muted-foreground">{jobLine.description}</p>
                  </div>
                )}
                
                {jobLine.notes && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-1">Notes:</h5>
                    <p className="text-sm text-muted-foreground">{jobLine.notes}</p>
                  </div>
                )}
                
                {associatedParts.length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm mb-2">Associated Parts ({associatedParts.length}):</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {associatedParts.map((part) => (
                        <div key={part.id} className="flex justify-between items-center p-2 bg-white rounded border">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{part.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {part.part_number} • Qty: {part.quantity}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${part.unit_price}</div>
                            <div className="text-xs text-muted-foreground">
                              Total: ${(part.quantity * part.unit_price).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </TableCell>
      </TableRow>
    </>
  );
}
