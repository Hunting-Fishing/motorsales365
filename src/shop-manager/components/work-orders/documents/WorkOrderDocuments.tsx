import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Download, Eye, Trash2, Plus, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuthUser } from '@/hooks/useAuthUser';

interface WorkOrderDocument {
  id: string;
  work_order_id: string | null;
  title: string;
  description?: string | null;
  document_type: string;
  file_path: string | null;
  file_url: string | null;
  file_size: number | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  tags: string[] | null;
  metadata?: any;
}

interface WorkOrderDocumentsProps {
  workOrderId: string;
  isEditMode: boolean;
}

export function WorkOrderDocuments({ workOrderId, isEditMode }: WorkOrderDocumentsProps) {
  const { user } = useAuthUser();
  const [documents, setDocuments] = useState<WorkOrderDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [workOrderId]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !isEditMode) return;

    setIsUploading(true);
    
    try {
      for (const file of files) {
        // Upload to Supabase Storage
        const fileName = `${workOrderId}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('work-order-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save document record
        const { error: insertError } = await supabase
          .from('documents')
          .insert({
            work_order_id: workOrderId,
            title: file.name,
            description: `Uploaded file: ${file.name}`,
            document_type: 'file',
            file_url: uploadData.path,
            file_size: file.size,
            created_by: user?.id || '',
            created_by_name: user?.email || 'Unknown User'
          });

        if (insertError) throw insertError;
      }
      
      toast.success(`${files.length} document(s) uploaded successfully`);
      await fetchDocuments();
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Failed to upload documents');
    } finally {
      setIsUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const downloadDocument = async (document: WorkOrderDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('work-order-documents')
        .download(document.file_url);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.title;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Document downloaded');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const deleteDocument = async (documentId: string, filePath: string) => {
    if (!isEditMode) return;
    
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('work-order-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;
      
      toast.success('Document deleted successfully');
      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (documentType: string) => {
    if (documentType.includes('image')) return <File className="h-4 w-4 text-blue-500" />;
    if (documentType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (documentType.includes('document')) return <FileText className="h-4 w-4 text-blue-600" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Loading documents...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
            {documents.length > 0 && (
              <Badge variant="secondary" className="rounded-full">
                {documents.length}
              </Badge>
            )}
          </CardTitle>
          
          {isEditMode && (
            <div className="flex gap-2">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="document-upload"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              />
              <Button
                size="sm"
                onClick={() => document.getElementById('document-upload')?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents uploaded yet</p>
            {isEditMode && (
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={() => document.getElementById('document-upload')?.click()}
              >
                <Plus className="h-4 w-4" />
                Upload First Document
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1">
                      {getFileIcon(doc.document_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {doc.document_type}
                        </Badge>
                      </div>
                      
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                        <span>Created by {doc.created_by_name}</span>
                        <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadDocument(doc)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    {isEditMode && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteDocument(doc.id, doc.file_url)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}