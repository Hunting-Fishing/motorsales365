
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { FormDescription, FormMessage } from '@/components/ui/form';

interface MetadataEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({
  value,
  onChange,
  error
}) => {
  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Enter JSON metadata"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-sm h-32"
      />
      {error && <FormMessage>{error}</FormMessage>}
      <FormDescription>
        Advanced: Add custom JSON metadata to use with this enrollment
      </FormDescription>
    </div>
  );
};
