import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  shopId: string;
}

const DOCUMENT_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'registration', label: 'Registration' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'inspection', label: 'Inspection Report' },
  { value: 'receipt', label: 'Receipt/Invoice' },
  { value: 'other', label: 'Other' }
];

export function UploadDocumentDialog({ open, onOpenChange, equipmentId, shopId }: UploadDocumentDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('other');
  const [expiryDate, setExpiryDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const queryClient = useQueryClient();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      if (!name) {
        setName(f.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [name]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      
      setIsUploading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', user.id)
        .single();

      const uploaderName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
        : user.email;

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${equipmentId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('equipment-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('equipment-attachments')
        .getPublicUrl(fileName);

      // Create document record
      const { error: insertError } = await supabase
        .from('equipment_documents')
        .insert({
          equipment_id: equipmentId,
          shop_id: shopId,
          name: name || file.name,
          description: description || null,
          document_type: documentType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          expiry_date: expiryDate || null,
          uploaded_by: user.id,
          uploaded_by_name: uploaderName
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-documents', equipmentId] });
      toast.success('Document uploaded successfully');
      handleClose();
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload document');
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const handleClose = () => {
    setFile(null);
    setName('');
    setDescription('');
    setDocumentType('other');
    setExpiryDate('');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              ${file ? 'bg-muted' : ''}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-foreground">
                  {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, Images, Word, Excel (max 10MB)
                </p>
              </>
            )}
          </div>

          {/* Document Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Document Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter document name"
              required
            />
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expiry Date */}
          {['certificate', 'warranty', 'registration', 'insurance'].includes(documentType) && (
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description or notes"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
