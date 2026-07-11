import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Gauge,
  Link2,
} from 'lucide-react';
import {
  useInspectionTemplate,
  useUpdateInspectionTemplate,
  useAddInspectionSection,
  useUpdateInspectionSection,
  useDeleteInspectionSection,
  useAddInspectionItem,
  useUpdateInspectionItem,
  useDeleteInspectionItem,
  useReorderInspectionItems,
  useReorderInspectionSections,
} from '@/hooks/useInspectionTemplates';
import type { InspectionFormSection, InspectionFormItem, InspectionItemType } from '@/types/inspectionTemplate';
import { ITEM_TYPE_LABELS } from '@/types/inspectionTemplate';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { ComponentPickerDialog } from './ComponentPickerDialog';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';
import { AssignTemplateToEquipmentDialog } from './AssignTemplateToEquipmentDialog';
import type { ComponentDefinition } from '@/config/componentCatalog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface InspectionTemplateBuilderProps {
  templateId: string;
  onClose: () => void;
}

export function InspectionTemplateBuilder({ templateId, onClose }: InspectionTemplateBuilderProps) {
  const { data: template, isLoading } = useInspectionTemplate(templateId);
  const updateTemplate = useUpdateInspectionTemplate();
  const addSection = useAddInspectionSection();
  const updateSection = useUpdateInspectionSection();
  const deleteSection = useDeleteInspectionSection();
  const addItem = useAddInspectionItem();
  const updateItem = useUpdateInspectionItem();
  const deleteItem = useDeleteInspectionItem();
  const reorderSections = useReorderInspectionSections();
  const { toast } = useToast();

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<{ itemId: string; sectionId: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSectionDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id && template?.sections) {
        const oldIndex = template.sections.findIndex((s) => s.id === active.id);
        const newIndex = template.sections.findIndex((s) => s.id === over.id);

        const newSections = arrayMove(template.sections, oldIndex, newIndex);
        const updates = newSections.map((section, index) => ({
          id: section.id,
          display_order: index + 1,
        }));

        reorderSections.mutate({ templateId, sections: updates });
      }
    },
    [template?.sections, templateId, reorderSections]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Template not found</p>
        <Button variant="outline" onClick={onClose} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const handleSaveTemplateDetails = async () => {
    await updateTemplate.mutateAsync({
      templateId,
      updates: {
        name: tempName || template.name,
        description: tempDescription || template.description,
      },
    });
    setEditingName(false);
  };

  const handleTogglePublish = async () => {
    await updateTemplate.mutateAsync({
      templateId,
      updates: {
        is_published: !template.is_published,
        version: template.is_published ? template.version : template.version + 1,
      },
    });
  };

  const handleAddSection = async () => {
    const displayOrder = (template.sections?.length || 0) + 1;
    await addSection.mutateAsync({
      templateId,
      title: `Section ${displayOrder}`,
      displayOrder,
    });
  };

  const handleDeleteSection = async () => {
    if (deleteSectionId) {
      await deleteSection.mutateAsync({ sectionId: deleteSectionId, templateId });
      setDeleteSectionId(null);
    }
  };

  const handleDeleteItem = async () => {
    if (deleteItemId) {
      await deleteItem.mutateAsync({ itemId: deleteItemId.itemId, templateId });
      setDeleteItemId(null);
    }
  };

  const sectionIds = template.sections?.map((s) => s.id) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="text-xl font-bold"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveTemplateDetails}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <h2
                className="text-2xl font-bold cursor-pointer hover:text-primary"
                onClick={() => {
                  setTempName(template.name);
                  setTempDescription(template.description || '');
                  setEditingName(true);
                }}
              >
                {template.name}
              </h2>
            )}
            <p className="text-muted-foreground">
              {template.is_base_template ? 'Base Template' : 'Custom Template'} • v{template.version}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <Label htmlFor="publish" className="text-sm">
              {template.is_published ? 'Published' : 'Draft'}
            </Label>
            <Switch
              id="publish"
              checked={template.is_published}
              onCheckedChange={handleTogglePublish}
            />
          </div>
          <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
            <Link2 className="mr-2 h-4 w-4" />
            Assign to Equipment
          </Button>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <TemplatePreviewDialog
            templateId={templateId}
            open={previewOpen}
            onOpenChange={setPreviewOpen}
          />
          <AssignTemplateToEquipmentDialog
            templateId={templateId}
            templateName={template.name}
            templateAssetType={template.asset_type}
            isBaseTemplate={template.is_base_template}
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
          />
        </div>
      </div>

      {/* Sections */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {template.sections?.map((section) => (
              <SortableSectionCard
                key={section.id}
                section={section}
                templateId={templateId}
                onUpdateSection={updateSection}
                onDeleteSection={() => setDeleteSectionId(section.id)}
                onAddItem={addItem}
                onUpdateItem={updateItem}
                onDeleteItem={(itemId) => setDeleteItemId({ itemId, sectionId: section.id })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={handleAddSection}
        disabled={addSection.isPending}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Section
      </Button>

      {/* Delete Section Confirmation */}
      <AlertDialog open={!!deleteSectionId} onOpenChange={() => setDeleteSectionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the section and all its items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSection}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Confirmation */}
      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inspection item?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface SectionCardProps {
  section: InspectionFormSection;
  templateId: string;
  onUpdateSection: ReturnType<typeof useUpdateInspectionSection>;
  onDeleteSection: () => void;
  onAddItem: ReturnType<typeof useAddInspectionItem>;
  onUpdateItem: ReturnType<typeof useUpdateInspectionItem>;
  onDeleteItem: (itemId: string) => void;
  dragListeners?: any;
}

function SortableSectionCard(props: Omit<SectionCardProps, 'dragListeners'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.section.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <SectionCard {...props} dragListeners={listeners} />
    </div>
  );
}

function SectionCard({
  section,
  templateId,
  onUpdateSection,
  onDeleteSection,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  dragListeners,
}: SectionCardProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(section.title);
  const [newlyAddedItemId, setNewlyAddedItemId] = useState<string | null>(null);
  const [componentPickerOpen, setComponentPickerOpen] = useState(false);
  const reorderItems = useReorderInspectionItems();

  const existingItemKeys = section.items?.map((item) => item.item_key) || [];
  const itemIds = section.items?.map((item) => item.id) || [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleItemDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id && section.items) {
        const oldIndex = section.items.findIndex((i) => i.id === active.id);
        const newIndex = section.items.findIndex((i) => i.id === over.id);

        const newItems = arrayMove(section.items, oldIndex, newIndex);
        const updates = newItems.map((item, index) => ({
          id: item.id,
          display_order: index + 1,
        }));

        reorderItems.mutate({ templateId, items: updates });
      }
    },
    [section.items, templateId, reorderItems]
  );

  const handleSaveTitle = async () => {
    if (tempTitle.trim() && tempTitle !== section.title) {
      await onUpdateSection.mutateAsync({
        sectionId: section.id,
        templateId,
        updates: { title: tempTitle.trim() },
      });
    }
    setEditingTitle(false);
  };

  const handleAddItem = async () => {
    const displayOrder = (section.items?.length || 0) + 1;
    const result = await onAddItem.mutateAsync({
      sectionId: section.id,
      templateId,
      item: {
        item_name: `New Item`,
        item_key: `item_${displayOrder}_${Date.now()}`,
        item_type: 'gyr_status',
        display_order: displayOrder,
        is_required: false,
      },
    });
    // Set the newly added item to auto-open in edit mode
    if (result?.id) {
      setNewlyAddedItemId(result.id);
    }
  };

  const handleAddComponents = async (components: ComponentDefinition[]) => {
    const startOrder = (section.items?.length || 0) + 1;
    let successCount = 0;
    let errorMessages: string[] = [];
    
    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      try {
        await onAddItem.mutateAsync({
          sectionId: section.id,
          templateId,
          item: {
            item_name: comp.name,
            item_key: comp.key,
            item_type: comp.type === 'fluid_level' ? 'gyr_status' : comp.type,
            display_order: startOrder + i,
            is_required: false,
            description: comp.description,
            component_category: comp.category,
            linked_component_type: comp.key,
            unit: comp.unit,
          },
        });
        successCount++;
      } catch (error: any) {
        console.error(`Failed to add component ${comp.name}:`, error);
        errorMessages.push(`${comp.name}: ${error?.message || 'Unknown error'}`);
      }
    }
    
    if (successCount > 0) {
      toast({
        title: "Components Added",
        description: `Successfully added ${successCount} component${successCount > 1 ? 's' : ''} to the section.`,
      });
    }
    
    if (errorMessages.length > 0) {
      toast({
        title: "Some components failed to add",
        description: errorMessages.join(', '),
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                {...dragListeners}
                className="cursor-grab active:cursor-grabbing touch-none"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="h-8"
                    autoFocus
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') {
                        setTempTitle(section.title);
                        setEditingTitle(false);
                      }
                    }}
                  />
                </div>
              ) : (
                <CardTitle
                  className="text-lg cursor-pointer hover:text-primary"
                  onClick={() => {
                    setTempTitle(section.title);
                    setEditingTitle(true);
                  }}
                >
                  {section.title}
                </CardTitle>
              )}
              <Badge variant="secondary">{section.items?.length || 0} items</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onDeleteSection}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleItemDragEnd}
            >
              <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                {section.items?.map((item) => (
                  <SortableItemRow
                    key={item.id}
                    item={item}
                    templateId={templateId}
                    onUpdate={onUpdateItem}
                    onDelete={() => onDeleteItem(item.id)}
                    autoEdit={item.id === newlyAddedItemId}
                    onEditComplete={() => setNewlyAddedItemId(null)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 border border-dashed"
                onClick={handleAddItem}
                disabled={onAddItem.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-primary/50 text-primary hover:bg-primary/10"
                onClick={() => setComponentPickerOpen(true)}
                disabled={onAddItem.isPending}
              >
                <Gauge className="mr-2 h-4 w-4" />
                Add Equipment Component
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <ComponentPickerDialog
        open={componentPickerOpen}
        onOpenChange={setComponentPickerOpen}
        onSelectComponents={handleAddComponents}
        existingKeys={existingItemKeys}
      />
    </Card>
  );
}

interface ItemRowProps {
  item: InspectionFormItem;
  templateId: string;
  onUpdate: ReturnType<typeof useUpdateInspectionItem>;
  onDelete: () => void;
  autoEdit?: boolean;
  onEditComplete?: () => void;
  dragListeners?: any;
}

function SortableItemRow(props: Omit<ItemRowProps, 'dragListeners'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ItemRow {...props} dragListeners={listeners} />
    </div>
  );
}

function ItemRow({ item, templateId, onUpdate, onDelete, autoEdit, onEditComplete, dragListeners }: ItemRowProps) {
  const [isEditing, setIsEditing] = useState(autoEdit ?? false);
  const [tempName, setTempName] = useState(item.item_name);
  const [tempType, setTempType] = useState<InspectionItemType>(item.item_type as InspectionItemType);
  const [tempRequired, setTempRequired] = useState(item.is_required);
  const [isSaving, setIsSaving] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // Handle autoEdit prop changes
  React.useEffect(() => {
    if (autoEdit) {
      setIsEditing(true);
      onEditComplete?.();
    }
  }, [autoEdit, onEditComplete]);

  const hasChanges = tempName !== item.item_name || tempType !== item.item_type || tempRequired !== item.is_required;

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }
    
    if (!tempName.trim()) {
      toast({
        title: 'Item name required',
        description: 'Please enter a name for this inspection item.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate.mutateAsync({
        itemId: item.id,
        templateId,
        updates: {
          item_name: tempName.trim(),
          item_type: tempType,
          is_required: tempRequired,
        },
      });
      setIsEditing(false);
      toast({
        title: 'Saved',
        description: 'Item updated successfully.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTempName(item.item_name);
    setTempType(item.item_type as InspectionItemType);
    setTempRequired(item.is_required);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Auto-focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div 
        ref={rowRef}
        className="flex items-center gap-2 p-3 rounded-lg border-2 border-primary/50 bg-muted/50 shadow-sm"
      >
        <div
          {...dragListeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          ref={inputRef}
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          placeholder="Enter item name..."
          disabled={isSaving}
        />
        <Select 
          value={tempType} 
          onValueChange={(v) => setTempType(v as InspectionItemType)}
          disabled={isSaving}
          open={isSelectOpen}
          onOpenChange={setIsSelectOpen}
        >
          <SelectTrigger className="w-40" onKeyDown={handleKeyDown}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[9999] bg-popover">
            {Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            checked={tempRequired}
            onCheckedChange={setTempRequired}
            disabled={isSaving}
          />
          <span className="text-xs text-muted-foreground">Required</span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => {
        setTempName(item.item_name);
        setTempType(item.item_type as InspectionItemType);
        setTempRequired(item.is_required);
        setIsEditing(true);
      }}
    >
      <div
        {...dragListeners}
        className="cursor-grab active:cursor-grabbing touch-none"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="flex-1 font-medium">{item.item_name}</span>
      <Badge variant="outline">{ITEM_TYPE_LABELS[item.item_type as InspectionItemType]}</Badge>
      {item.is_required && <Badge variant="secondary">Required</Badge>}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
