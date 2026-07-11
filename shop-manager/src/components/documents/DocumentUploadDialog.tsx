
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DocumentService } from '@/services/documentService';
import { DocumentCategory, CreateDocumentData } from '@/types/document';
import { supabase } from '@/integrations/supabase/client';

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentCreated?: (document: any) => void;
  workOrderId?: string;
  customerId?: string;
  categories?: DocumentCategory[];
}

export const DocumentUploadDialog: React.FC<DocumentUploadDialogProps> = ({
  open,
  onOpenChange,
  onDocumentCreated,
  workOrderId,
  customerId,
  categories = []
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<'pdf' | 'image' | 'weblink' | 'internal_link'>('pdf');
  const [categoryId, setCategoryId] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState('');
  const { toast } = useToast();

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFile(null);
    setDocumentType('pdf');
    setCategoryId('');
    setUploadProgress(0);
    setFileError('');
  };

  const validateFile = (file: File): boolean => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain'
    ];

    if (file.size > maxSize) {
      setFileError('File size must be less than 50MB');
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      setFileError('File type not supported. Please use PDF, Word, or image files.');
      return false;
    }

    setFileError('');
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
    } else if (selectedFile) {
      setFile(null);
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

    setIsUploading(true);
    let uploadSuccessful = false;
    let documentCreated = false;

    try {
      // Phase 1: User Authentication
      console.log('Phase 1: Checking user authentication...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let filePath = '';

      // Phase 2: File Upload (if file exists)
      if (file) {
        try {
          console.log('Phase 2: Starting file upload...');
          if (!validateFile(file)) {
            return;
          }

          setUploadProgress(10);
          
          // Get user's shop ID for folder structure - handle both patterns
          const { data: profile } = await supabase
            .from('profiles')
            .select('shop_id')
            .or(`id.eq.${user.id},user_id.eq.${user.id}`)
            .maybeSingle();

          if (!profile?.shop_id) {
            throw new Error('Shop ID not found');
          }

          setUploadProgress(30);

          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const bucketName = workOrderId ? 'work-order-documents' : 'documents';
          const fullFilePath = `${profile.shop_id}/${fileName}`;
          
          setUploadProgress(50);

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fullFilePath, file);

          if (uploadError) throw uploadError;

          setUploadProgress(70);
          filePath = uploadData.path;
          uploadSuccessful = true;
          console.log('Phase 2: File upload successful');
          
          setUploadProgress(90);
        } catch (uploadError) {
          console.error('Phase 2: File upload failed:', uploadError);
          throw new Error(`File upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      }

      // Phase 3: Database Document Creation
      try {
        console.log('Phase 3: Creating document record...');
        // Get user's display name from profiles
        const userName = await DocumentService.getUserDisplayName(user.id);

        const documentData: CreateDocumentData = {
          title: title.trim(),
          description: description.trim() || undefined,
          document_type: documentType,
          file_path: filePath || undefined,
          file_size: file?.size,
          mime_type: file?.type,
          category_id: categoryId || undefined,
          work_order_id: workOrderId || undefined,
          customer_id: customerId || undefined,
          is_public: false,
          metadata: {},
          tags: [],
          created_by: user.id,
          created_by_name: userName
        };

        setUploadProgress(95);
        const newDocument = await DocumentService.uploadDocument(documentData);
        documentCreated = true;
        console.log('Phase 3: Document record created successfully');
        setUploadProgress(100);

        // Phase 4: Success Notification (isolate from callback)
        setTimeout(() => {
          toast({
            title: "Success",
            description: "Document uploaded successfully.",
          });
        }, 100);

        // Phase 5: Callback Execution (isolated to prevent affecting success state)
        if (onDocumentCreated) {
          try {
            console.log('Phase 5: Executing callback...');
            setTimeout(() => {
              onDocumentCreated(newDocument);
            }, 200);
          } catch (callbackError) {
            console.error('Phase 5: Callback failed, but upload was successful:', callbackError);
            // Don't throw - upload was successful
          }
        }

        // Phase 6: Cleanup
        setTimeout(() => {
          resetForm();
          onOpenChange(false);
        }, 300);

      } catch (dbError) {
        console.error('Phase 3: Document creation failed:', dbError);
        throw new Error(`Document creation failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }

    } catch (error) {
      console.error('Upload process failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document. Please try again.';
      
      // Only show error toast if we haven't already shown success
      if (!documentCreated) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsUploading(false);
      // Clear progress after a small delay to show completion
      setTimeout(() => {
        setUploadProgress(0);
      }, 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter document description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="documentType">Document Type</Label>
            <Select value={documentType} onValueChange={(value: any) => setDocumentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="weblink">Web Link</SelectItem>
                <SelectItem value="internal_link">Internal Link</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {categories.length > 0 && (
            <div>
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
          )}

          <div>
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt"
            />
            {fileError && (
              <p className="text-sm text-destructive mt-1">{fileError}</p>
            )}
            {file && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
