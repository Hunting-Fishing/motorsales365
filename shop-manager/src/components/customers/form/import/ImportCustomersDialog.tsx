
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, AlertCircle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { importCustomersFromCSV } from "@/services/customerService";

interface ImportCustomersDialogProps {
  onImportComplete: () => void;
}

export const ImportCustomersDialog: React.FC<ImportCustomersDialogProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setError(null);
    
    if (!selectedFile) {
      return;
    }
    
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please select a valid CSV file');
      return;
    }
    
    setFile(selectedFile);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await importCustomersFromCSV(file);
      setSuccess(true);
      toast({
        title: "Import Successful",
        description: `${result.imported} customers imported successfully.`,
        variant: "success",
      });
      
      setTimeout(() => {
        setOpen(false);
        onImportComplete();
      }, 2000);
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import customers');
      toast({
        title: "Import Failed",
        description: err instanceof Error ? err.message : 'Failed to import customers',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Import Customers
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Customers from CSV</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-sm text-gray-600">
            Upload a CSV file with customer data. The file should include columns for first_name, last_name, email, phone, and address.
          </div>
          
          <div className="border-2 border-dashed rounded-md p-6 text-center">
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-2">Drag and drop your CSV file here, or click to browse</p>
            <Input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
              className="mt-2"
            >
              Select File
            </Button>
            
            {file && (
              <div className="mt-4 text-sm flex items-center justify-center">
                <FileText className="h-4 w-4 mr-2 text-blue-500" />
                <span className="font-medium text-gray-800">{file.name}</span>
              </div>
            )}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                Customers imported successfully!
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || isLoading || success}>
              {isLoading ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
