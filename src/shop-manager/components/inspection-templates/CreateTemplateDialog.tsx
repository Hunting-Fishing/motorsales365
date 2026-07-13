import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateInspectionTemplate, useBaseTemplates } from '@/hooks/useInspectionTemplates';
import type { AssetType } from '@/types/inspectionTemplate';
import { ASSET_TYPE_LABELS } from '@/types/inspectionTemplate';

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (templateId: string) => void;
}

export function CreateTemplateDialog({ open, onOpenChange, onCreated }: CreateTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('vessel');
  const [isBaseTemplate, setIsBaseTemplate] = useState(true);
  const [parentTemplateId, setParentTemplateId] = useState<string>('');

  const createTemplate = useCreateInspectionTemplate();
  const { data: baseTemplates } = useBaseTemplates(assetType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await createTemplate.mutateAsync({
      name,
      description,
      asset_type: assetType,
      is_base_template: isBaseTemplate,
      parent_template_id: parentTemplateId || undefined,
      sections: [], // Start with empty sections, user will add them in builder
    });

    if (result) {
      onCreated(result.id);
      resetForm();
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setAssetType('vessel');
    setIsBaseTemplate(true);
    setParentTemplateId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Inspection Template</DialogTitle>
            <DialogDescription>
              Create a new pre-trip inspection template for your fleet assets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Heavy Truck Pre-Trip Inspection"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this template covers..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetType">Asset Type</Label>
              <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isBaseTemplate">Base Template</Label>
                <p className="text-sm text-muted-foreground">
                  Base templates can be used as starting points for asset-specific templates
                </p>
              </div>
              <Switch
                id="isBaseTemplate"
                checked={isBaseTemplate}
                onCheckedChange={setIsBaseTemplate}
              />
            </div>

            {!isBaseTemplate && baseTemplates && baseTemplates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="parentTemplate">Inherit From (Optional)</Label>
                <Select value={parentTemplateId} onValueChange={setParentTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a base template to inherit from" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {baseTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Inheriting from a base template will include all its sections and items
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || createTemplate.isPending}>
              {createTemplate.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
