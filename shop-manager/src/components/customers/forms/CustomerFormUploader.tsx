import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileUploader } from '@/components/shared/FileUploader';
import { uploadCustomerForm } from '@/services/customerFormService';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { TagInput } from '@/components/customers/documents/TagInput';

interface CustomerFormUploaderProps {
  customerId: string;
  customerName?: string;
  onSuccess?: () => void;
}

export function CustomerFormUploader({ customerId, customerName, onSuccess }: CustomerFormUploaderProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    
    // If no title is set yet, use the first file's name as a default title
    if (selectedFiles.length > 0 && !title) {
      const fileName = selectedFiles[0].name;
      // Remove extension from filename
      const titleFromFilename = fileName.split('.').slice(0, -1).join('.');
      setTitle(titleFromFilename);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }
    
    if (!title) {
      toast({
        title: 'Title required',
        description: 'Please provide a title for the form',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadCustomerForm({
        file: files[0],
        customerId,
        title,
        description,
        tags
      });

      if (result) {
        toast({
          title: 'Form uploaded',
          description: 'The form has been uploaded successfully',
        });
        
        // Reset form
        setTitle('');
        setDescription('');
        setFiles([]);
        setTags([]);
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error('Failed to upload form');
      }
    } catch (error) {
      console.error('Error uploading form:', error);
      toast({
        title: 'Upload failed',
        description: 'There was a problem uploading the form',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-card">
      <div>
        <h3 className="text-lg font-medium">Upload Customer Form</h3>
        {customerName && (
          <p className="text-sm text-muted-foreground">
            Uploading form for {customerName}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Form title"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the form"
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <TagInput
            value={tags}
            onChange={setTags}
            placeholder="Add tags..."
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground">
            Tags help with organizing and searching forms
          </p>
        </div>

        <div className="space-y-2">
          <Label>File</Label>
          <FileUploader
            onFilesSelected={handleFilesSelected}
            acceptedFileTypes={[
              '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'
            ]}
            maxFiles={1}
            currentFiles={files}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isUploading || !files.length}>
            {isUploading ? 'Uploading...' : 'Upload Form'}
          </Button>
        </div>
      </form>
    </div>
  );
}
