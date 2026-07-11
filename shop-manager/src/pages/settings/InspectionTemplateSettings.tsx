import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  FileText, 
  Ship, 
  Truck, 
  Car, 
  Wrench,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Eye,
  Link2
} from 'lucide-react';
import { useInspectionTemplates, useDeleteInspectionTemplate, useDuplicateInspectionTemplate } from '@/hooks/useInspectionTemplates';
import { useEquipmentByTemplate } from '@/hooks/useEquipmentByTemplate';
import { InspectionTemplateBuilder } from '@/components/inspection-templates/InspectionTemplateBuilder';
import { CreateTemplateDialog } from '@/components/inspection-templates/CreateTemplateDialog';
import { TemplatePreviewDialog } from '@/components/inspection-templates/TemplatePreviewDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AssetType, InspectionFormTemplate } from '@/types/inspectionTemplate';
import { ASSET_TYPE_LABELS } from '@/types/inspectionTemplate';
import { Skeleton } from '@/components/ui/skeleton';

const ASSET_TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  vessel: <Ship className="h-4 w-4" />,
  skiff: <Ship className="h-4 w-4" />,
  automobile: <Car className="h-4 w-4" />,
  heavy_truck: <Truck className="h-4 w-4" />,
  equipment: <Wrench className="h-4 w-4" />,
  forklift: <Wrench className="h-4 w-4" />,
  trailer: <Truck className="h-4 w-4" />,
  septic_system: <Wrench className="h-4 w-4" />,
};

export default function InspectionTemplateSettings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  const { data: templates, isLoading } = useInspectionTemplates();
  const { data: equipmentByTemplate } = useEquipmentByTemplate();
  const deleteTemplate = useDeleteInspectionTemplate();
  const duplicateTemplate = useDuplicateInspectionTemplate();

  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedAssetType === 'all' || template.asset_type === selectedAssetType;
    return matchesSearch && matchesType;
  });

  const baseTemplates = filteredTemplates?.filter((t) => t.is_base_template) || [];
  const customTemplates = filteredTemplates?.filter((t) => !t.is_base_template) || [];

  const handleDeleteTemplate = async () => {
    if (deleteTemplateId) {
      await deleteTemplate.mutateAsync(deleteTemplateId);
      setDeleteTemplateId(null);
    }
  };

  if (editingTemplateId) {
    return (
      <InspectionTemplateBuilder
        templateId={editingTemplateId}
        onClose={() => setEditingTemplateId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inspection Templates</h2>
          <p className="text-muted-foreground">
            Create and manage pre-trip inspection forms for different asset types
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedAssetType} onValueChange={(v) => setSelectedAssetType(v as AssetType | 'all')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="vessel">Vessels</TabsTrigger>
            <TabsTrigger value="heavy_truck">Trucks</TabsTrigger>
            <TabsTrigger value="automobile">Autos</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Base Templates */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Base Templates
          <Badge variant="secondary">{baseTemplates.length}</Badge>
        </h3>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : baseTemplates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <FileText className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No base templates yet. Create one to get started.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Base Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {baseTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                assignedEquipment={equipmentByTemplate?.[template.id] || []}
                onEdit={() => setEditingTemplateId(template.id)}
                onDelete={() => setDeleteTemplateId(template.id)}
                onPreview={() => setPreviewTemplateId(template.id)}
                onDuplicate={() => duplicateTemplate.mutate(template.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Custom/Asset-Specific Templates */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Asset-Specific Templates
          <Badge variant="secondary">{customTemplates.length}</Badge>
        </h3>

        {customTemplates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Wrench className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No custom templates yet. Create one based on a base template for specific assets.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                assignedEquipment={equipmentByTemplate?.[template.id] || []}
                onEdit={() => setEditingTemplateId(template.id)}
                onDelete={() => setDeleteTemplateId(template.id)}
                onPreview={() => setPreviewTemplateId(template.id)}
                onDuplicate={() => duplicateTemplate.mutate(template.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={(templateId) => {
          setIsCreateDialogOpen(false);
          setEditingTemplateId(templateId);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inspection template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      {previewTemplateId && (
        <TemplatePreviewDialog
          templateId={previewTemplateId}
          open={!!previewTemplateId}
          onOpenChange={(open) => !open && setPreviewTemplateId(null)}
        />
      )}
    </div>
  );
}

interface EquipmentAssignment {
  id: string;
  name: string;
  inspection_template_id: string;
}

function TemplateCard({
  template,
  assignedEquipment,
  onEdit,
  onDelete,
  onPreview,
  onDuplicate,
}: {
  template: InspectionFormTemplate;
  assignedEquipment: EquipmentAssignment[];
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
}) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {ASSET_TYPE_ICONS[template.asset_type]}
            <CardTitle className="text-lg">{template.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPreview}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="line-clamp-2">
          {template.description || 'No description'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {ASSET_TYPE_LABELS[template.asset_type]}
          </Badge>
          <Badge variant={template.is_published ? 'default' : 'secondary'}>
            {template.is_published ? 'Published' : 'Draft'}
          </Badge>
          <Badge variant="outline">v{template.version}</Badge>
        </div>
        
        {assignedEquipment.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Assigned to:
            </p>
            <div className="flex flex-wrap gap-1">
              {assignedEquipment.map((eq) => (
                <Badge 
                  key={eq.id} 
                  variant="outline" 
                  className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 text-xs"
                >
                  {eq.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
