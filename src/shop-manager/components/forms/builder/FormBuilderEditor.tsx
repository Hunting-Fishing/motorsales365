import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Save, Eye } from 'lucide-react';
import { FormBuilderTemplate, FormBuilderSection, FormBuilderField, FormFieldType } from '@/types/formBuilder';
import { SectionEditor } from './SectionEditor';
import { FieldTypePalette } from './FieldTypePalette';
import { useToast } from '@/components/ui/use-toast';
import { saveFormTemplate } from '@/services/formBuilderService';
import { v4 as uuidv4 } from 'uuid';

interface FormBuilderEditorProps {
  template?: FormBuilderTemplate;
  onSave?: (template: FormBuilderTemplate) => void;
  onPreview?: (template: FormBuilderTemplate) => void;
}

export const FormBuilderEditor: React.FC<FormBuilderEditorProps> = ({ 
  template: initialTemplate, 
  onSave, 
  onPreview 
}) => {
  const [template, setTemplate] = useState<FormBuilderTemplate>(initialTemplate || {
    id: 'new',
    name: '',
    description: '',
    category: 'general',
    isPublished: false,
    version: 1,
    sections: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddSection = () => {
    const newSection: FormBuilderSection = {
      id: uuidv4(),
      templateId: template.id,
      title: 'New Section',
      description: '',
      displayOrder: template.sections.length,
      fields: []
    };

    setTemplate({
      ...template,
      sections: [...template.sections, newSection]
    });
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<FormBuilderSection>) => {
    setTemplate({
      ...template,
      sections: template.sections.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      )
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    setTemplate({
      ...template,
      sections: template.sections.filter(s => s.id !== sectionId)
    });
  };

  const handleAddField = (sectionId: string, fieldType: FormFieldType) => {
    const section = template.sections.find(s => s.id === sectionId);
    if (!section) return;

    const newField: FormBuilderField = {
      id: uuidv4(),
      sectionId,
      label: 'New Field',
      fieldType,
      placeholder: '',
      helpText: '',
      isRequired: false,
      displayOrder: section.fields.length,
      options: fieldType === 'select' || fieldType === 'radio' ? [] : undefined
    };

    handleUpdateSection(sectionId, {
      fields: [...section.fields, newField]
    });
  };

  const handleUpdateField = (sectionId: string, fieldId: string, updates: Partial<FormBuilderField>) => {
    const section = template.sections.find(s => s.id === sectionId);
    if (!section) return;

    handleUpdateSection(sectionId, {
      fields: section.fields.map(f => 
        f.id === fieldId ? { ...f, ...updates } : f
      )
    });
  };

  const handleDeleteField = (sectionId: string, fieldId: string) => {
    const section = template.sections.find(s => s.id === sectionId);
    if (!section) return;

    handleUpdateSection(sectionId, {
      fields: section.fields.filter(f => f.id !== fieldId)
    });
  };

  const handleReorderSections = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = template.sections.findIndex(s => s.id === active.id);
      const newIndex = template.sections.findIndex(s => s.id === over.id);
      
      const newSections = arrayMove(template.sections, oldIndex, newIndex);
      setTemplate({
        ...template,
        sections: newSections.map((s, idx) => ({ ...s, displayOrder: idx }))
      });
    }
  };

  const handleSave = async () => {
    if (!template.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Form name is required",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const savedTemplate = await saveFormTemplate(template);
      if (savedTemplate) {
        toast({
          title: "Success",
          description: "Form template saved successfully"
        });
        if (onSave) onSave(savedTemplate);
        setTemplate(savedTemplate);
      } else {
        throw new Error('Failed to save template');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save form template",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    if (onPreview) onPreview(template);
  };

  return (
    <div className="space-y-6">
      {/* Template Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Form Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Form Name *</Label>
            <Input
              id="name"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              placeholder="Enter form name"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={template.description || ''}
              onChange={(e) => setTemplate({ ...template, description: e.target.value })}
              placeholder="Enter form description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select 
                value={template.category} 
                onValueChange={(value) => setTemplate({ ...template, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={template.isPublished}
                  onChange={(e) => setTemplate({ ...template, isPublished: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Published</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Form'}
            </Button>
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Field Type Palette */}
      <FieldTypePalette />

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Form Sections</h3>
          <Button onClick={handleAddSection} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleReorderSections}
        >
          <SortableContext
            items={template.sections.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {template.sections.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No sections yet. Click "Add Section" to get started.
                </CardContent>
              </Card>
            ) : (
              template.sections.map((section) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  allFields={template.sections.flatMap(s => s.fields)}
                  onUpdate={(updates) => handleUpdateSection(section.id, updates)}
                  onDelete={() => handleDeleteSection(section.id)}
                  onAddField={(fieldType) => handleAddField(section.id, fieldType)}
                  onUpdateField={(fieldId, updates) => handleUpdateField(section.id, fieldId, updates)}
                  onDeleteField={(fieldId) => handleDeleteField(section.id, fieldId)}
                />
              ))
            )}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
