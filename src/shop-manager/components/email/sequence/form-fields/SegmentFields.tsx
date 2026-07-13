
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormDescription } from '@/components/ui/form';
import { PlusCircle } from 'lucide-react';

interface SegmentField {
  key: string;
  value: string;
}

interface SegmentFieldsProps {
  fields: SegmentField[];
  updateField: (index: number, field: 'key' | 'value', value: string) => void;
  removeField: (index: number) => void;
  addField: () => void;
}

export const SegmentFields: React.FC<SegmentFieldsProps> = ({
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
            placeholder="Segment key"
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
        <PlusCircle className="mr-2 h-4 w-4" /> Add Segment Data
      </Button>
      <FormDescription>
        Add custom segmentation data that can be used for future targeting.
      </FormDescription>
    </div>
  );
};
