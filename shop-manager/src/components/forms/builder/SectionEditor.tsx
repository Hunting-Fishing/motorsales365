import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { FormBuilderSection, FormBuilderField, FormFieldType } from '@/types/formBuilder';
import { FieldEditor } from './FieldEditor';

interface SectionEditorProps {
  section: FormBuilderSection;
  allFields: FormBuilderField[];
  onUpdate: (updates: Partial<FormBuilderSection>) => void;
  onDelete: () => void;
  onAddField: (fieldType: FormFieldType) => void;
  onUpdateField: (fieldId: string, updates: Partial<FormBuilderField>) => void;
  onDeleteField: (fieldId: string) => void;
}

export const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  allFields,
  onUpdate,
  onDelete,
  onAddField,
  onUpdateField,
  onDeleteField
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fieldType = e.dataTransfer.getData('fieldType') as FormFieldType;
    if (fieldType) {
      onAddField(fieldType);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  return (
    <Card ref={setNodeRef} style={style} className="relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab hover:bg-accent p-1 rounded">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            value={section.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="font-semibold max-w-xs"
            placeholder="Section title"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          <Textarea
            value={section.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Section description (optional)"
            rows={2}
          />

          <div
            className="space-y-2 min-h-[100px] border-2 border-dashed rounded-lg p-4"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {section.fields.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                Drag field types here to add fields
              </div>
            ) : (
              section.fields.map((field) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  allFields={allFields}
                  onUpdate={(updates) => onUpdateField(field.id, updates)}
                  onDelete={() => onDeleteField(field.id)}
                />
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
