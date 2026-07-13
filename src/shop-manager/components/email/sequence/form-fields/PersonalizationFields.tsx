
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormDescription } from '@/components/ui/form';
import { PlusCircle } from 'lucide-react';

interface PersonalizationField {
  key: string;
  value: string;
}

interface PersonalizationFieldsProps {
  fields: PersonalizationField[];
  updateField: (index: number, field: 'key' | 'value', value: string) => void;
  removeField: (index: number) => void;
  addField: () => void;
}

export const PersonalizationFields: React.FC<PersonalizationFieldsProps> = ({
  fields,
  updateField,
  removeField,
  addField,
}) => {
  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={index} className="flex gap-2">
          <Input
            placeholder="Variable name"
            value={field.key}
            onChange={(e) => updateField(index, 'key', e.target.value)}
            className="w-1/3"
          />
          <Input
            placeholder="Value"
            value={field.value}
            onChange={(e) => updateField(index, 'value', e.target.value)}
            className="w-2/3"
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={() => removeField(index)}
          >
            &times;
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addField}
      >
        <PlusCircle className="mr-2 h-4 w-4" /> Add Variable
      </Button>
      <FormDescription>
        Add personalization variables to use in your email templates with {'{{'} variable_name {'}}'} syntax.
      </FormDescription>
    </div>
  );
};
