import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Ship, Truck, Wrench, Package, Info } from 'lucide-react';
import { useEquipmentForTemplateAssignment, useAssignTemplateToEquipment } from '@/hooks/useTemplateEquipmentAssignment';
import { toast } from 'sonner';
import type { AssetType } from '@/types/inspectionTemplate';

interface AssignTemplateToEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
  templateAssetType: AssetType;
  isBaseTemplate: boolean;
}

const ASSET_TYPE_ICONS: Record<string, React.ReactNode> = {
  vessel: <Ship className="h-4 w-4" />,
  skiff: <Ship className="h-4 w-4" />,
  automobile: <Truck className="h-4 w-4" />,
  heavy_truck: <Truck className="h-4 w-4" />,
  equipment: <Wrench className="h-4 w-4" />,
  forklift: <Package className="h-4 w-4" />,
  trailer: <Package className="h-4 w-4" />,
};

export function AssignTemplateToEquipmentDialog({
  open,
  onOpenChange,
  templateId,
  templateName,
  templateAssetType,
  isBaseTemplate,
}: AssignTemplateToEquipmentDialogProps) {
  const { data: equipment, isLoading } = useEquipmentForTemplateAssignment();
  const assignMutation = useAssignTemplateToEquipment();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Initialize selected IDs when equipment data loads
  // For base templates, don't pre-select since they create copies
  useEffect(() => {
    if (equipment && !isBaseTemplate) {
      const currentlyAssigned = equipment
        .filter(e => e.inspection_template_id === templateId)
        .map(e => e.id);
      setSelectedIds(currentlyAssigned);
    } else {
      setSelectedIds([]);
    }
  }, [equipment, templateId, isBaseTemplate]);

  const handleToggle = (equipmentId: string) => {
    setSelectedIds(prev =>
      prev.includes(equipmentId)
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const handleSave = async () => {
    const previousEquipmentIds = isBaseTemplate 
      ? [] 
      : equipment?.filter(e => e.inspection_template_id === templateId).map(e => e.id) || [];

    try {
      const result = await assignMutation.mutateAsync({
        templateId,
        equipmentIds: selectedIds,
        previousEquipmentIds,
        isBaseTemplate,
        templateName,
      });
      
      if (result.isBaseTemplate && result.createdTemplates.length > 0) {
        toast.success(`Created ${result.createdTemplates.length} asset-specific template(s)`, {
          description: result.createdTemplates.join(', '),
        });
      } else {
        toast.success(`Template assigned to ${result.assigned} equipment`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to assign template');
    }
  };

  // Group equipment by matching/non-matching asset type
  const matchingEquipment = equipment?.filter(e => e.equipment_type === templateAssetType) || [];
  const otherEquipment = equipment?.filter(e => e.equipment_type !== templateAssetType) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Template to Equipment</DialogTitle>
          <DialogDescription>
            Select which equipment should use "<span className="font-medium">{templateName}</span>" for inspections.
          </DialogDescription>
        </DialogHeader>

        {isBaseTemplate && (
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
              This is a <strong>Base Template</strong>. Assigning it will create an <strong>Asset-Specific copy</strong> for each selected equipment (e.g., "{templateName} - CADAL").
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4">
              {/* Matching asset type equipment */}
              {matchingEquipment.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    {ASSET_TYPE_ICONS[templateAssetType]}
                    <span className="capitalize">{templateAssetType.replace('_', ' ')}s (Matching)</span>
                  </div>
                  <div className="space-y-1">
                    {matchingEquipment.map(item => (
                      <EquipmentCheckboxItem
                        key={item.id}
                        item={item}
                        isSelected={selectedIds.includes(item.id)}
                        onToggle={handleToggle}
                        templateId={templateId}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other equipment */}
              {otherEquipment.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Other Equipment
                  </div>
                  <div className="space-y-1">
                    {otherEquipment.map(item => (
                      <EquipmentCheckboxItem
                        key={item.id}
                        item={item}
                        isSelected={selectedIds.includes(item.id)}
                        onToggle={handleToggle}
                        templateId={templateId}
                      />
                    ))}
                  </div>
                </div>
              )}

              {equipment?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No equipment found.
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={assignMutation.isPending}>
            {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EquipmentCheckboxItemProps {
  item: {
    id: string;
    name: string;
    equipment_type: string;
    inspection_template_id: string | null;
  };
  isSelected: boolean;
  onToggle: (id: string) => void;
  templateId: string;
}

function EquipmentCheckboxItem({ item, isSelected, onToggle, templateId }: EquipmentCheckboxItemProps) {
  const hasOtherTemplate = item.inspection_template_id && item.inspection_template_id !== templateId;

  return (
    <div 
      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
      onClick={() => onToggle(item.id)}
    >
      <Checkbox 
        checked={isSelected} 
        onCheckedChange={() => onToggle(item.id)}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0">
        <Label className="cursor-pointer font-medium">{item.name}</Label>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-xs capitalize">
            {item.equipment_type?.replace('_', ' ') || 'Unknown'}
          </Badge>
          {hasOtherTemplate && (
            <span className="text-xs text-amber-600">Has different template</span>
          )}
        </div>
      </div>
    </div>
  );
}
