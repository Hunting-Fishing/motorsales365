
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Upload } from 'lucide-react';

interface WorkOrderDocumentsProps {
  workOrderId: string;
  isEditMode?: boolean;
}

export function WorkOrderDocuments({ 
  workOrderId, 
  isEditMode = false 
}: WorkOrderDocumentsProps) {
  return (
    <div className="space-y-6">
      {/* Documents Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents & Attachments
            </CardTitle>
            {isEditMode && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 px-3">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
                <Button size="sm" className="h-8 px-3">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No documents uploaded yet</p>
            {isEditMode && (
              <p className="text-xs mt-2">Upload documents, photos, or add links related to this work order</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
