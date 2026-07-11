import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Hash, Calendar, CheckSquare, List, Mail, Phone, Upload, PenTool } from 'lucide-react';
import { FormFieldType } from '@/types/formBuilder';

const fieldTypes: { type: FormFieldType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text', icon: <FileText className="h-4 w-4" /> },
  { type: 'textarea', label: 'Text Area', icon: <FileText className="h-4 w-4" /> },
  { type: 'number', label: 'Number', icon: <Hash className="h-4 w-4" /> },
  { type: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  { type: 'phone', label: 'Phone', icon: <Phone className="h-4 w-4" /> },
  { type: 'date', label: 'Date', icon: <Calendar className="h-4 w-4" /> },
  { type: 'select', label: 'Dropdown', icon: <List className="h-4 w-4" /> },
  { type: 'radio', label: 'Radio', icon: <CheckSquare className="h-4 w-4" /> },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="h-4 w-4" /> },
  { type: 'file', label: 'File Upload', icon: <Upload className="h-4 w-4" /> },
  { type: 'signature', label: 'Signature', icon: <PenTool className="h-4 w-4" /> },
];

export const FieldTypePalette: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Field Types</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {fieldTypes.map((field) => (
            <div
              key={field.type}
              className="flex flex-col items-center p-3 border rounded-lg hover:bg-accent hover:border-primary cursor-move transition-colors"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('fieldType', field.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              {field.icon}
              <span className="text-xs mt-1 text-center">{field.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Drag a field type into a section to add it
        </p>
      </CardContent>
    </Card>
  );
};
