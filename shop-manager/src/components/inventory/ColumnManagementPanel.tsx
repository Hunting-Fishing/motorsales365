import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { 
  Settings2, 
  Eye, 
  EyeOff, 
  GripVertical, 
  Search,
  ChevronDown,
  RotateCcw,
  Save
} from 'lucide-react';
import { Column } from './table/SortableColumnHeader';
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
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ColumnManagementPanelProps {
  columns: Column[];
  onColumnsChange: (columns: Column[]) => void;
  onResetToDefault: () => void;
  onSaveLayout: () => void;
}

interface SortableColumnItemProps {
  column: Column;
  onToggleVisibility: (columnId: string) => void;
}

function SortableColumnItem({ column, onToggleVisibility }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center justify-between p-3 bg-card border rounded-lg
        ${isDragging ? 'shadow-lg z-10' : 'hover:bg-muted/50'}
        transition-colors
      `}
    >
      <div className="flex items-center space-x-3 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        
        <Checkbox
          checked={column.visible}
          onCheckedChange={() => onToggleVisibility(column.id)}
          className="data-[state=checked]:bg-primary"
        />
        
        <div className="flex-1 min-w-0">
          <Label className="text-sm font-medium cursor-pointer" htmlFor={column.id}>
            {column.label}
          </Label>
          <p className="text-xs text-muted-foreground truncate">
            {column.name}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {column.visible ? (
          <Eye className="h-4 w-4 text-green-600" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

export function ColumnManagementPanel({
  columns,
  onColumnsChange,
  onResetToDefault,
  onSaveLayout
}: ColumnManagementPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isBasicOpen, setIsBasicOpen] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((column) => column.id === active.id);
      const newIndex = columns.findIndex((column) => column.id === over.id);

      const newColumns = [...columns];
      const [reorderedColumn] = newColumns.splice(oldIndex, 1);
      newColumns.splice(newIndex, 0, reorderedColumn);

      onColumnsChange(newColumns);
    }
  };

  const handleToggleVisibility = (columnId: string) => {
    const updatedColumns = columns.map((col) =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(updatedColumns);
  };

  const filteredColumns = columns.filter((column) =>
    column.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    column.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedColumns = {
    basic: filteredColumns.filter(col => 
      ['partNumber', 'name', 'sku', 'barcode', 'category', 'subcategory'].includes(col.id)
    ),
    inventory: filteredColumns.filter(col => 
      ['quantity', 'onOrder', 'reorderPoint', 'location', 'status'].includes(col.id)
    ),
    pricing: filteredColumns.filter(col => 
      ['cost', 'unitPrice', 'marginMarkup', 'totalValue'].includes(col.id)
    ),
    details: filteredColumns.filter(col => 
      !['partNumber', 'name', 'sku', 'barcode', 'category', 'subcategory', 
        'quantity', 'onOrder', 'reorderPoint', 'location', 'status',
        'cost', 'unitPrice', 'marginMarkup', 'totalValue'].includes(col.id)
    )
  };

  const visibleCount = columns.filter(col => col.visible).length;
  const totalCount = columns.length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Columns
          <Badge variant="secondary" className="ml-2">
            {visibleCount}/{totalCount}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage Table Columns</SheetTitle>
          <SheetDescription>
            Customize which columns are visible and reorder them by dragging.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-sm font-medium">
              {visibleCount} of {totalCount} columns visible
            </span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={onResetToDefault}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button size="sm" onClick={onSaveLayout}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredColumns.map(col => col.id)}
              strategy={verticalListSortingStrategy}
            >
              {/* Basic Information */}
              <Collapsible open={isBasicOpen} onOpenChange={setIsBasicOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isBasicOpen ? 'rotate-0' : '-rotate-90'}`} />
                    <span className="font-medium">Basic Information</span>
                    <Badge variant="outline">{groupedColumns.basic.filter(col => col.visible).length}/{groupedColumns.basic.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {groupedColumns.basic.map((column) => (
                    <SortableColumnItem
                      key={column.id}
                      column={column}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Inventory Management */}
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? 'rotate-0' : '-rotate-90'}`} />
                    <span className="font-medium">Inventory Management</span>
                    <Badge variant="outline">{groupedColumns.inventory.filter(col => col.visible).length}/{groupedColumns.inventory.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {groupedColumns.inventory.map((column) => (
                    <SortableColumnItem
                      key={column.id}
                      column={column}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Pricing */}
              <Collapsible open={isPricingOpen} onOpenChange={setIsPricingOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isPricingOpen ? 'rotate-0' : '-rotate-90'}`} />
                    <span className="font-medium">Pricing & Costs</span>
                    <Badge variant="outline">{groupedColumns.pricing.filter(col => col.visible).length}/{groupedColumns.pricing.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {groupedColumns.pricing.map((column) => (
                    <SortableColumnItem
                      key={column.id}
                      column={column}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Additional Details */}
              <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isDetailsOpen ? 'rotate-0' : '-rotate-90'}`} />
                    <span className="font-medium">Additional Details</span>
                    <Badge variant="outline">{groupedColumns.details.filter(col => col.visible).length}/{groupedColumns.details.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {groupedColumns.details.map((column) => (
                    <SortableColumnItem
                      key={column.id}
                      column={column}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </SortableContext>
          </DndContext>
        </div>
      </SheetContent>
    </Sheet>
  );
}