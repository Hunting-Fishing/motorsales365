
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  editingCertificate?: any;
  onSave: (data: any) => Promise<any>;
}

export function CertificateDialog({ open, onOpenChange, memberId, memberName, editingCertificate, onSave }: CertificateDialogProps) {
  const [formData, setFormData] = useState({
    certificate_name: '',
    certificate_type: 'Technical',
    issuing_organization: '',
    issue_date: '',
    expiry_date: '',
    certificate_number: '',
    verification_url: '',
    status: 'active',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingCertificate) {
      setFormData({
        certificate_name: editingCertificate.certificate_name || '',
        certificate_type: editingCertificate.certificate_type || 'Technical',
        issuing_organization: editingCertificate.issuing_organization || '',
        issue_date: editingCertificate.issue_date || '',
        expiry_date: editingCertificate.expiry_date || '',
        certificate_number: editingCertificate.certificate_number || '',
        verification_url: editingCertificate.verification_url || '',
        status: editingCertificate.status || 'active',
        notes: editingCertificate.notes || ''
      });
    } else {
      setFormData({
        certificate_name: '',
        certificate_type: 'Technical',
        issuing_organization: '',
        issue_date: '',
        expiry_date: '',
        certificate_number: '',
        verification_url: '',
        status: 'active',
        notes: ''
      });
    }
  }, [editingCertificate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dataToSave = {
      ...formData,
      profile_id: memberId,
      expiry_date: formData.expiry_date || null,
      certificate_number: formData.certificate_number || null,
      verification_url: formData.verification_url || null,
      notes: formData.notes || null
    };

    const result = await onSave(editingCertificate ? dataToSave : dataToSave);
    
    setIsSubmitting(false);
    
    if (result.success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingCertificate ? 'Edit Certificate' : 'Add Certificate'}</DialogTitle>
          <DialogDescription>
            {editingCertificate ? 'Update certificate information' : `Add a new certificate for ${memberName}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="cert_name">Certificate Name *</Label>
              <Input
                id="cert_name"
                value={formData.certificate_name}
                onChange={(e) => setFormData(prev => ({ ...prev, certificate_name: e.target.value }))}
                placeholder="e.g., ASE Master Technician"
                required
              />
            </div>

            <div>
              <Label htmlFor="cert_type">Certificate Type *</Label>
              <Select value={formData.certificate_type} onValueChange={(value) => setFormData(prev => ({ ...prev, certificate_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASE">ASE Certification</SelectItem>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Safety">Safety</SelectItem>
                  <SelectItem value="License">License</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="issuing_org">Issuing Organization *</Label>
              <Input
                id="issuing_org"
                value={formData.issuing_organization}
                onChange={(e) => setFormData(prev => ({ ...prev, issuing_organization: e.target.value }))}
                placeholder="e.g., ASE, OSHA"
                required
              />
            </div>

            <div>
              <Label htmlFor="issue_date">Issue Date *</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="cert_number">Certificate Number</Label>
              <Input
                id="cert_number"
                value={formData.certificate_number}
                onChange={(e) => setFormData(prev => ({ ...prev, certificate_number: e.target.value }))}
                placeholder="Certificate ID/Number"
              />
            </div>

            <div>
              <Label htmlFor="verification_url">Verification URL</Label>
              <Input
                id="verification_url"
                type="url"
                value={formData.verification_url}
                onChange={(e) => setFormData(prev => ({ ...prev, verification_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional information..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingCertificate ? 'Update Certificate' : 'Add Certificate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
