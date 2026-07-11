import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MANUAL_TYPES } from '@/types/manual';
import { Upload } from 'lucide-react';

interface UploadManualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentName: string;
  onSuccess: () => void;
}

export function UploadManualDialog({
  open,
  onOpenChange,
  equipmentId,
  equipmentName,
  onSuccess,
}: UploadManualDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    manufacturer: '',
    model: '',
    manual_type: '',
    document_number: '',
    version: '',
    notes: '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a file to upload',
      });
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('equipment-manuals')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create manual record
      const { data: manual, error: manualError } = await supabase
        .from('equipment_manuals')
        .insert({
          title: formData.title,
          description: formData.description || null,
          manufacturer: formData.manufacturer || null,
          model: formData.model || null,
          manual_type: formData.manual_type || null,
          document_number: formData.document_number || null,
          version: formData.version || null,
          file_url: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (manualError) throw manualError;

      // Link manual to equipment
      const { error: linkError } = await supabase
        .from('equipment_manual_links')
        .insert({
          equipment_id: equipmentId,
          manual_id: manual.id,
        });

      if (linkError) throw linkError;

      toast({
        title: 'Success',
        description: 'Manual uploaded and linked to equipment',
      });

      onSuccess();
      onOpenChange(false);
      setFile(null);
      setFormData({
        title: '',
        description: '',
        manufacturer: '',
        model: '',
        manual_type: '',
        document_number: '',
        version: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error uploading manual:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload manual',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Manual for {equipmentName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="file">File *</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supported: PDF, Word, Images (Max 50MB)
            </p>
          </div>

          <div>
            <Label htmlFor="title">Manual Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., CAT 3406E Service Manual"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g., Caterpillar"
              />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., 3406E"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manual_type">Manual Type</Label>
              <Select
                value={formData.manual_type}
                onValueChange={(value) => setFormData({ ...formData, manual_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="document_number">Document Number</Label>
              <Input
                id="document_number"
                value={formData.document_number}
                onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                placeholder="e.g., SENR3666-03"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="e.g., Rev. 3, 2023"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of manual contents"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Uploading...' : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Link
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
