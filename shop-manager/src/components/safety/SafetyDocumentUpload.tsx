import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSafetyDocuments } from '@/hooks/useSafetyDocuments';
import { Upload, FileText, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import type { SafetyDocumentType } from '@/types/safety';

const DOCUMENT_TYPES: { value: SafetyDocumentType; label: string; category?: string }[] = [
  { value: 'sds', label: 'Safety Data Sheet (SDS)', category: 'chemical' },
  { value: 'policy', label: 'Policy', category: 'general' },
  { value: 'procedure', label: 'Procedure', category: 'general' },
  { value: 'training_material', label: 'Training Material', category: 'general' },
  { value: 'inspection_form', label: 'Inspection Form', category: 'general' },
  { value: 'permit', label: 'Permit', category: 'general' },
  { value: 'certification', label: 'Certification', category: 'general' },
  { value: 'manual', label: 'Manual', category: 'general' },
  { value: 'emergency_plan', label: 'Emergency Plan', category: 'general' },
  { value: 'torque_spec', label: 'Torque Specifications', category: 'technical' },
  { value: 'wiring_diagram', label: 'Wiring Diagram', category: 'technical' },
  { value: 'working_at_height', label: 'Working at Height Procedure', category: 'height_safety' },
  { value: 'ev_safety', label: 'EV Safety Procedure', category: 'ev' },
  { value: 'other', label: 'Other', category: 'general' },
];

const HAZARD_CLASSES = [
  'Flammable',
  'Oxidizer',
  'Corrosive',
  'Toxic',
  'Irritant',
  'Carcinogen',
  'Explosive',
  'Compressed Gas',
  'Environmental Hazard',
];

interface SafetyDocumentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SafetyDocumentUpload({ open, onOpenChange }: SafetyDocumentUploadProps) {
  const { uploadDocument } = useSafetyDocuments();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    document_type: 'sds' as SafetyDocumentType,
    title: '',
    description: '',
    chemical_name: '',
    manufacturer: '',
    hazard_classification: [] as string[],
    storage_location: '',
    department: '',
    expiry_date: '',
    vehicle_make: '',
    vehicle_model: '',
    equipment_type: ''
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      // Auto-fill title from filename
      if (!formData.title) {
        const nameWithoutExt = acceptedFiles[0].name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, title: nameWithoutExt }));
      }
    }
  }, [formData.title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  const handleHazardToggle = (hazard: string) => {
    setFormData(prev => ({
      ...prev,
      hazard_classification: prev.hazard_classification.includes(hazard)
        ? prev.hazard_classification.filter(h => h !== hazard)
        : [...prev.hazard_classification, hazard]
    }));
  };

  const handleSubmit = async () => {
    if (!file) return;
    
    setUploading(true);
    const result = await uploadDocument(file, {
      document_type: formData.document_type,
      title: formData.title,
      description: formData.description || undefined,
      chemical_name: formData.document_type === 'sds' ? formData.chemical_name : undefined,
      manufacturer: formData.document_type === 'sds' ? formData.manufacturer : undefined,
      hazard_classification: formData.document_type === 'sds' ? formData.hazard_classification : undefined,
      storage_location: formData.storage_location || undefined,
      department: formData.department || undefined,
      expiry_date: formData.expiry_date || undefined
    });
    
    setUploading(false);
    
    if (result) {
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFile(null);
    setFormData({
      document_type: 'sds',
      title: '',
      description: '',
      chemical_name: '',
      manufacturer: '',
      hazard_classification: [],
      storage_location: '',
      department: '',
      expiry_date: '',
      vehicle_make: '',
      vehicle_model: '',
      equipment_type: ''
    });
  };

  const isSDS = formData.document_type === 'sds';
  const isTechnical = ['torque_spec', 'wiring_diagram'].includes(formData.document_type);
  const isEVSafety = formData.document_type === 'ev_safety';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Safety Document</DialogTitle>
          <DialogDescription>
            Upload safety documents, SDS sheets, policies, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
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
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop a file here, or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, DOCX, PNG, JPG
                </p>
              </>
            )}
          </div>

          {/* Document Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select
                value={formData.document_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, document_type: value as SafetyDocumentType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the document..."
            />
          </div>

          {/* SDS-specific fields */}
          {isSDS && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chemical_name">Chemical Name</Label>
                  <Input
                    id="chemical_name"
                    value={formData.chemical_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, chemical_name: e.target.value }))}
                    placeholder="e.g., Brake Cleaner"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hazard Classification</Label>
                <div className="flex flex-wrap gap-2">
                  {HAZARD_CLASSES.map((hazard) => (
                    <Button
                      key={hazard}
                      type="button"
                      size="sm"
                      variant={formData.hazard_classification.includes(hazard) ? 'default' : 'outline'}
                      onClick={() => handleHazardToggle(hazard)}
                    >
                      {hazard}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storage_location">Storage Location</Label>
                <Input
                  id="storage_location"
                  value={formData.storage_location}
                  onChange={(e) => setFormData(prev => ({ ...prev, storage_location: e.target.value }))}
                  placeholder="e.g., Chemical Cabinet A"
                />
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={uploading || !file || !formData.title}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
