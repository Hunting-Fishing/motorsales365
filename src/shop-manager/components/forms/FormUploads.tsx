
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FormUpload {
  id: string;
  filename: string;
  filetype: string;
  filesize: string;
  uploadedAt: string;
}

interface FormUploadsProps {
  formId: string;
}

export function FormUploads({ formId }: FormUploadsProps) {
  const [uploads, setUploads] = useState<FormUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchUploads = async () => {
    try {
      // Using customer_documents as a fallback since document_uploads doesn't exist
      const { data, error } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('category', formId);

      if (error) {
        console.error('Error fetching uploads:', error);
        setUploads([]);
      } else {
        const formattedUploads = data?.map(upload => ({
          id: upload.id,
          filename: upload.file_name,
          filetype: upload.file_type,
          filesize: `${upload.file_size} bytes`,
          uploadedAt: upload.created_at,
        })) || [];
        setUploads(formattedUploads);
      }
    } catch (error) {
      console.error('Error fetching uploads:', error);
      setUploads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, [formId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Create a simple upload record in customer_documents table
      const { data, error } = await supabase
        .from('customer_documents')
        .insert({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          title: file.name,
          description: `Form upload for ${formId}`,
          category: formId,
          file_path: `/uploads/${file.name}`,
          original_name: file.name,
          uploaded_by: 'system',
          uploaded_by_name: 'System',
          customer_id: '00000000-0000-0000-0000-000000000000' // Placeholder
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded.`,
      });

      fetchUploads();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('customer_documents')
        .delete()
        .eq('id', uploadId);

      if (error) throw error;

      toast({
        title: "File deleted",
        description: "The file has been successfully deleted.",
      });

      fetchUploads();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed",
        description: "There was an error deleting the file.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Form Uploads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading uploads...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Form Uploads
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="file-upload">Upload File</Label>
          <Input
            id="file-upload"
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="mt-1"
          />
          {uploading && (
            <p className="text-sm text-muted-foreground mt-1">Uploading...</p>
          )}
        </div>

        {uploads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No files uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{upload.filename}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">{upload.filetype}</Badge>
                      <span>{formatFileSize(upload.filesize)}</span>
                      <span>•</span>
                      <span>{new Date(upload.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(upload.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
