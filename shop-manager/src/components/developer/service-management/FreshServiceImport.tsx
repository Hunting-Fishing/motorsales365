
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Database, Trash2 } from 'lucide-react';
import { StorageImportManager } from './StorageImportManager';
import { ServiceImportProgress } from './ServiceImportProgress';
import { LiveBucketViewer } from './LiveBucketViewer';
import { DatabaseDiagnostics } from './DatabaseDiagnostics';
import { useServiceManagement } from '@/hooks/useServiceManagement';

export function FreshServiceImport({ onImportComplete }: { onImportComplete?: () => void }) {
  const {
    isImporting,
    isClearing,
    importProgress,
    handleClearDatabase,
    handleRefreshData
  } = useServiceManagement();

  const handleImportComplete = async () => {
    await handleRefreshData();
    onImportComplete?.();
  };

  return (
    <div className="space-y-6">
      {/* Database Diagnostics */}
      <DatabaseDiagnostics />
      
      {/* Live Bucket Status */}
      <LiveBucketViewer />
      
      {/* Database Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              onClick={handleRefreshData}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Live Data
            </Button>
            <Button
              onClick={handleClearDatabase}
              variant="destructive"
              size="sm"
              disabled={isImporting || isClearing}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isClearing ? 'Clearing Database...' : 'Clear Live Database'}
            </Button>
          </div>

          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              All operations work with live data in your Supabase database. No mock or sample data is used.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Import Manager */}
      <StorageImportManager 
        onImportComplete={handleImportComplete}
        isImporting={isImporting}
      />

      {/* Progress Display */}
      <ServiceImportProgress
        isImporting={isImporting || isClearing}
        progress={importProgress.progress}
        stage={importProgress.stage}
        message={importProgress.message}
        error={importProgress.error}
        completed={importProgress.completed}
        operation={isClearing ? 'Live Database Clear' : 'Live Service Import'}
        onCancel={() => {}}
      />
    </div>
  );
}
