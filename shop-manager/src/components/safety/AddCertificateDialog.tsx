import React, { useState, useEffect, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, X } from 'lucide-react';

interface AddCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  staffOptions: { id: string; name: string }[];
  certificateTypes: { id: string; name: string; default_validity_months?: number }[];
}

export function AddCertificateDialog({
  open,
  onOpenChange,
  onSuccess,
  staffOptions,
  certificateTypes
}: AddCertificateDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    staff_id: '',
    certificate_type_id: '',
    certificate_number: '',
    issue_date: '',
    expiry_date: '',
    issuing_authority: '',
    notes: ''
  });

  // Auto-calculate expiry date when certificate type changes
  useEffect(() => {
    if (formData.certificate_type_id && formData.issue_date) {
      const certType = certificateTypes.find(ct => ct.id === formData.certificate_type_id);
      if (certType?.default_validity_months) {
        const issueDate = new Date(formData.issue_date);
        const expiryDate = new Date(issueDate);
        expiryDate.setMonth(expiryDate.getMonth() + certType.default_validity_months);
        setFormData(prev => ({
          ...prev,
          expiry_date: expiryDate.toISOString().split('T')[0]
        }));
      }
    }
  }, [formData.certificate_type_id, formData.issue_date, certificateTypes]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PDF or image file',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'File must be less than 10MB',
        variant: 'destructive'
      });
      return;
    }

    setDocumentFile(file);
  };

  const uploadDocument = async (): Promise<string | null> => {
    if (!documentFile || !formData.staff_id) return null;

    setUploading(true);
    try {
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${formData.staff_id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('staff-certificates')
        .upload(fileName, documentFile);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('staff-certificates')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload document',
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = () => {
    setDocumentFile(null);
    setDocumentUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.staff_id || !formData.certificate_type_id || !formData.issue_date) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Upload document if present
      let uploadedDocUrl: string | null = null;
      if (documentFile) {
        uploadedDocUrl = await uploadDocument();
      }

      const { error } = await supabase
        .from('staff_certificates')
        .insert({
          staff_id: formData.staff_id,
          certificate_type_id: formData.certificate_type_id,
          certificate_number: formData.certificate_number || null,
          issue_date: formData.issue_date,
          expiry_date: formData.expiry_date || null,
          issuing_authority: formData.issuing_authority || null,
          notes: formData.notes || null,
          document_url: uploadedDocUrl,
          verification_status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Certificate added successfully'
      });

      setFormData({
        staff_id: '',
        certificate_type_id: '',
        certificate_number: '',
        issue_date: '',
        expiry_date: '',
        issuing_authority: '',
        notes: ''
      });
      setDocumentFile(null);
      setDocumentUrl(null);

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding certificate:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add certificate',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Staff Certificate</DialogTitle>
          <DialogDescription>
            Record a new certification or training completion for a staff member
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="staff_id">Staff Member *</Label>
              <Select
                value={formData.staff_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, staff_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffOptions.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificate_type_id">Certificate Type *</Label>
              <Select
                value={formData.certificate_type_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, certificate_type_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {certificateTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificate_number">Certificate Number</Label>
            <Input
              id="certificate_number"
              value={formData.certificate_number}
              onChange={(e) => setFormData(prev => ({ ...prev, certificate_number: e.target.value }))}
              placeholder="Enter certificate number (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date *</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuing_authority">Issuing Authority</Label>
            <Input
              id="issuing_authority"
              value={formData.issuing_authority}
              onChange={(e) => setFormData(prev => ({ ...prev, issuing_authority: e.target.value }))}
              placeholder="e.g., OSHA, State Agency, Training Provider"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or comments"
              rows={3}
            />
          </div>

          {/* Document Upload */}
          <div className="space-y-2">
            <Label>Certificate Document</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {documentFile ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-primary" />
                <span className="flex-1 text-sm truncate">{documentFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeDocument}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Document (PDF or Image)
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Upload a scan or photo of the certificate (max 10MB)
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Certificate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
