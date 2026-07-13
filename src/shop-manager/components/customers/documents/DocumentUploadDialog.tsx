
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentService } from '@/services/documentService';
import { DocumentCategory, CreateDocumentData, CustomerDocument } from '@/types/document';
import { useToast } from '@/hooks/use-toast';
import { TagInput } from './TagInput';

export interface DocumentUploadDialogProps {
  customerId?: string;
  workOrderId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentUploaded?: (document: CustomerDocument) => void;
  onDocumentCreated?: (document: any) => void;
  categories: DocumentCategory[];
}

export const DocumentUploadDialog: React.FC<DocumentUploadDialogProps> = ({
  customerId,
  workOrderId,
  open,
  onOpenChange,
  onDocumentUploaded,
  onDocumentCreated,
  categories
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [documentType, setDocumentType] = useState<'pdf' | 'image' | 'weblink' | 'internal_link'>('pdf');
  const [tags, setTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [webUrl, setWebUrl] = useState('');
  
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Auto-set document type based on file type
      if (selectedFile.type.startsWith('image/')) {
        setDocumentType('image');
      } else if (selectedFile.type === 'application/pdf') {
        setDocumentType('pdf');
      }
      
      // Auto-set title if not already set
      if (!title) {
        setTitle(selectedFile.name.split('.')[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the document.",
        variant: "destructive",
      });
      return;
    }

    if (documentType === 'weblink' && !webUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a URL for the web link.",
        variant: "destructive",
      });
      return;
    }

    if ((documentType === 'pdf' || documentType === 'image') && !file) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      let fileUrl = '';
      let filePath = '';
      let fileSize = 0;
      let mimeType = '';

      // Handle file upload for PDF and image types
      if ((documentType === 'pdf' || documentType === 'image') && file) {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const uploadPath = `documents/${fileName}`;
        
        const uploadResult = await DocumentService.uploadFile(file, uploadPath);
        filePath = uploadResult.path;
        fileSize = file.size;
        mimeType = file.type;
      } else if (documentType === 'weblink') {
        fileUrl = webUrl;
      }

      const documentData: CreateDocumentData = {
        title: title.trim(),
        description: description.trim() || undefined,
        document_type: documentType,
        file_path: filePath || undefined,
        file_url: fileUrl || undefined,
        file_size: fileSize || undefined,
        mime_type: mimeType || undefined,
        category_id: categoryId || undefined,
        customer_id: customerId || undefined,
        work_order_id: workOrderId || undefined,
        is_public: false,
        metadata: {},
        tags: tags.length > 0 ? tags : undefined,
        created_by: 'current-user-id', // This should come from auth context
        created_by_name: 'Current User' // This should come from auth context
      };

      const document = await DocumentService.createDocument(documentData);

      toast({
        title: "Success",
        description: "Document uploaded successfully.",
      });

      // Call the appropriate callback
      if (onDocumentUploaded && customerId) {
        onDocumentUploaded(document as CustomerDocument);
      }
      if (onDocumentCreated) {
        onDocumentCreated(document);
      }

      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      setCategoryId('');
      setDocumentType('pdf');
      setTags([]);
      setWebUrl('');
      onOpenChange(false);

    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setCategoryId('');
    setDocumentType('pdf');
    setTags([]);
    setWebUrl('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Select
              value={documentType}
              onValueChange={(value) => setDocumentType(value as 'pdf' | 'image' | 'weblink' | 'internal_link')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="weblink">Web Link</SelectItem>
                <SelectItem value="internal_link">Internal Link</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(documentType === 'pdf' || documentType === 'image') && (
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept={documentType === 'pdf' ? '.pdf' : 'image/*'}
                required
              />
            </div>
          )}

          {documentType === 'weblink' && (
            <div className="space-y-2">
              <Label htmlFor="web-url">URL</Label>
              <Input
                id="web-url"
                type="url"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                placeholder="https://example.com"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter document description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="Add tags..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
