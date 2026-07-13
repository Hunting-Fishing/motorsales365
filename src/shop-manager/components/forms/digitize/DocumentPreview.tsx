import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Image, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentPreviewProps {
  documentUrl: string | null;
  fileName?: string;
}

export function DocumentPreview({ documentUrl, fileName }: DocumentPreviewProps) {
  const isPdf = fileName?.toLowerCase().endsWith('.pdf');
  const isImage = fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);

  if (!documentUrl) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No Document Attached</p>
          <p className="text-sm">
            You can still create a form template without a source document.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isImage ? (
              <Image className="h-5 w-5 text-muted-foreground" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="font-medium">{fileName || 'Document'}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(documentUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open in New Tab
          </Button>
        </div>

        <div className="bg-muted rounded-lg overflow-hidden">
          {isPdf ? (
            <iframe
              src={`${documentUrl}#view=FitH`}
              className="w-full h-[500px]"
              title="Document Preview"
            />
          ) : isImage ? (
            <img
              src={documentUrl}
              alt="Document Preview"
              className="w-full max-h-[500px] object-contain"
            />
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Preview not available for this file type</p>
              <Button
                variant="link"
                onClick={() => window.open(documentUrl, '_blank')}
                className="mt-2"
              >
                Download to view
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
