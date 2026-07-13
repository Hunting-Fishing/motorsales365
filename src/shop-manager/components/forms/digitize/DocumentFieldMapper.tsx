import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, MousePointer } from 'lucide-react';

interface DocumentFieldMapperProps {
  documentUrl: string | null;
  onFieldAdd?: (position: { x: number; y: number }) => void;
}

export function DocumentFieldMapper({ documentUrl, onFieldAdd }: DocumentFieldMapperProps) {
  // This is a placeholder for future visual field mapping functionality
  // For now, we use the manual field addition approach in the wizard
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <MousePointer className="h-4 w-4" />
          Visual Field Mapping
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 rounded-lg p-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="mb-2">Visual field mapping coming soon</p>
          <p className="text-sm">
            For now, please use the manual field addition in Step 3 to define your form fields.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
