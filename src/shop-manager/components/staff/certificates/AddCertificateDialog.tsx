import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStaffCertificates, StaffCertificate } from '@/hooks/useStaffCertificates';

interface AddCertificateDialogProps {
  staffId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCertificate?: StaffCertificate | null;
}

const defaultFormData = {
  certificate_type_id: '',
  certificate_number: '',
  issue_date: '',
  expiry_date: '',
  training_date: '',
  issuing_authority: '',
  notes: '',
};

export function AddCertificateDialog({ staffId, open, onOpenChange, editCertificate }: AddCertificateDialogProps) {
  const { certificateTypes, addCertificate, updateCertificate, isAdding, isUpdating } = useStaffCertificates();
  const [formData, setFormData] = useState(defaultFormData);

  const isEditMode = !!editCertificate;

  // Populate form when editing
  useEffect(() => {
    if (editCertificate && open) {
      setFormData({
        certificate_type_id: editCertificate.certificate_type_id || '',
        certificate_number: editCertificate.certificate_number || '',
        issue_date: editCertificate.issue_date || '',
        expiry_date: editCertificate.expiry_date || '',
        training_date: editCertificate.training_date || '',
        issuing_authority: editCertificate.issuing_authority || '',
        notes: editCertificate.notes || '',
      });
    } else if (!open) {
      setFormData(defaultFormData);
    }
  }, [editCertificate, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.certificate_type_id || !formData.issue_date) {
      return;
    }

    if (isEditMode && editCertificate) {
      updateCertificate({
        id: editCertificate.id,
        certificate_type_id: formData.certificate_type_id,
        certificate_number: formData.certificate_number || null,
        issue_date: formData.issue_date,
        expiry_date: formData.expiry_date || null,
        training_date: formData.training_date || null,
        issuing_authority: formData.issuing_authority || null,
        notes: formData.notes || null,
      });
    } else {
      addCertificate({
        staff_id: staffId,
        certificate_type_id: formData.certificate_type_id,
        certificate_number: formData.certificate_number || null,
        issue_date: formData.issue_date,
        expiry_date: formData.expiry_date || null,
        training_date: formData.training_date || null,
        issuing_authority: formData.issuing_authority || null,
        status: 'active',
        notes: formData.notes || null,
        document_url: null,
      });
    }

    setFormData(defaultFormData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Certificate' : 'Add Certificate'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update the certificate details below'
              : 'Add a new certificate or training record for this staff member'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="certificate_type">Certificate Type *</Label>
            <Select
              value={formData.certificate_type_id}
              onValueChange={(value) => setFormData({ ...formData, certificate_type_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select certificate type" />
              </SelectTrigger>
              <SelectContent>
                {certificateTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="certificate_number">Certificate Number</Label>
              <Input
                id="certificate_number"
                value={formData.certificate_number}
                onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
                placeholder="e.g., TC-1234567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issuing_authority">Issuing Authority</Label>
              <Input
                id="issuing_authority"
                value={formData.issuing_authority}
                onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                placeholder="e.g., Transport Canada"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date *</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="training_date">Training Date</Label>
              <Input
                id="training_date"
                type="date"
                value={formData.training_date}
                onChange={(e) => setFormData({ ...formData, training_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding || isUpdating}>
              {isAdding || isUpdating 
                ? (isEditMode ? 'Updating...' : 'Adding...') 
                : (isEditMode ? 'Update Certificate' : 'Add Certificate')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
