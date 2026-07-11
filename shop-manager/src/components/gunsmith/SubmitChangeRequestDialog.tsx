import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useFeatureRequests } from '@/hooks/useFeatureRequests';
import { useAuthUser } from '@/hooks/useAuthUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  MODULE_OPTIONS,
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  type ModuleType,
  type FeatureRequest,
} from '@/types/feature-requests';

interface SubmitChangeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultModule?: ModuleType;
}

export function SubmitChangeRequestDialog({
  open,
  onOpenChange,
  defaultModule = 'general',
}: SubmitChangeRequestDialogProps) {
  const { createFeatureRequest, notifyDeveloper } = useFeatureRequests();
  const { user, userName } = useAuthUser();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reason_for_change: '',
    module: defaultModule,
    category: 'functionality' as FeatureRequest['category'],
    priority: 'medium' as FeatureRequest['priority'],
    submitter_name: userName || '',
    submitter_email: user?.email || '',
  });

  const onDrop = (acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter((file) =>
      file.type.startsWith('image/')
    );
    setUploadedFiles((prev) => [...prev, ...imageFiles].slice(0, 5)); // Max 5 images
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (uploadedFiles.length === 0) return [];

    const urls: string[] = [];
    
    for (const file of uploadedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `feature-requests/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('gunsmith-documents')
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading file:', error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('gunsmith-documents')
        .getPublicUrl(fileName);

      urls.push(publicUrl);
    }

    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a title and description for your request.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images first
      const imageUrls = await uploadImages();

      // Create the feature request
      const result = await createFeatureRequest({
        ...formData,
        tags: imageUrls.length > 0 ? ['has-attachments'] : [],
      }, imageUrls);

      if (result) {
        // Notify developer
        await notifyDeveloper(result);

        toast({
          title: 'Request Submitted!',
          description: "Thank you for your feedback. We'll review it and keep you updated.",
        });

        // Reset form
        setFormData({
          title: '',
          description: '',
          reason_for_change: '',
          module: defaultModule,
          category: 'functionality',
          priority: 'medium',
          submitter_name: userName || '',
          submitter_email: user?.email || '',
        });
        setUploadedFiles([]);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Change Request</DialogTitle>
          <DialogDescription>
            Have an idea to improve the app? Let us know! We review all requests and prioritize based on feedback.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief summary of your request"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what you'd like to see changed or added..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              required
            />
          </div>

          {/* Reason for Change */}
          <div className="space-y-2">
            <Label htmlFor="reason">Why is this needed?</Label>
            <Textarea
              id="reason"
              placeholder="Help us understand why this change would be valuable..."
              value={formData.reason_for_change}
              onChange={(e) => setFormData((prev) => ({ ...prev, reason_for_change: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Module & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select
                value={formData.module}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, module: value as ModuleType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value as FeatureRequest['priority'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={option.color}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value as FeatureRequest['category'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Screenshots (optional)</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? 'Drop images here...' : 'Drag & drop images or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Max 5 images, 10MB each</p>
            </div>

            {/* Preview uploaded files */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="relative group w-16 h-16 rounded-lg overflow-hidden border"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Name"
                value={formData.submitter_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, submitter_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email for updates"
                value={formData.submitter_email}
                onChange={(e) => setFormData((prev) => ({ ...prev, submitter_email: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
