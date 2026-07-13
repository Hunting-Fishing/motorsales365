
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CustomerDocument } from '@/types/document';
import { uploadDocumentVersion } from '@/services/documentService';

interface DocumentVersionDialogProps {
  document: CustomerDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVersionUploaded: () => void;
}

export const DocumentVersionDialog: React.FC<DocumentVersionDialogProps> = ({
  document,
  open,
  onOpenChange,
  onVersionUploaded
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [versionNotes, setVersionNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      await uploadDocumentVersion(
        document.id,
        file,
        versionNotes || undefined
      );
      
      toast({
        title: "New version uploaded",
        description: "The new version was uploaded successfully",
      });
      
      onVersionUploaded();
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error uploading version:", error);
      toast({
        title: "Upload failed",
        description: "There was a problem uploading the new version",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setVersionNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogDescription>
            Upload a new version of "{document.title}"
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="file">Select File</Label>
            <Input 
              id="file" 
              type="file" 
              onChange={handleFileChange} 
              className="mt-1"
            />
            {file && (
              <p className="text-sm text-gray-500 mt-1">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="versionNotes">Version Notes</Label>
            <Textarea
              id="versionNotes"
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              className="mt-1"
              placeholder="Describe what's changed in this version"
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || !file}>
              {isUploading ? "Uploading..." : "Upload Version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
