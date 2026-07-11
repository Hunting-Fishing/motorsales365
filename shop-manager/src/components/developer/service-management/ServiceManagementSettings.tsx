
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { AlertTriangle, Trash2, Database } from 'lucide-react';
import { ServiceImportProgress } from './ServiceImportProgress';
import { useServiceManagement } from '@/hooks/useServiceManagement';

interface ServiceManagementSettingsProps {
  children: React.ReactNode;
  onDataChange?: () => void;
}

export function ServiceManagementSettings({ children, onDataChange }: ServiceManagementSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const {
    isClearing,
    importProgress,
    handleClearDatabase
  } = useServiceManagement();

  const resetProgress = () => {
    // Progress is managed by the hook
  };

  const confirmClear = async () => {
    setShowConfirmDialog(false);
    await handleClearDatabase();
    onDataChange?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        resetProgress();
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Service Management Settings</DialogTitle>
          <DialogDescription>
            Configure and manage your service hierarchy data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800">Warning: Destructive Action</p>
                  <p className="mt-1 text-red-700">
                    This will permanently delete all service sectors, categories, subcategories, and jobs from the database.
                  </p>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={() => setShowConfirmDialog(true)}
                disabled={isClearing}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isClearing ? 'Clearing Database...' : 'Clear Service Database'}
              </Button>

              <ServiceImportProgress
                isImporting={isClearing}
                progress={importProgress.progress}
                stage={importProgress.stage}
                message={importProgress.message}
                error={importProgress.error}
                completed={importProgress.completed}
                operation="clear"
              />
            </CardContent>
          </Card>
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Database Clear</DialogTitle>
              <DialogDescription>
                Are you absolutely sure you want to clear the entire service database? 
                This action cannot be undone and will delete all service data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmClear}
              >
                Yes, Clear Database
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
