
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FreshServiceImport } from './FreshServiceImport';
import { ServiceImportProgress } from './ServiceImportProgress';
import { LiveBucketViewer } from './LiveBucketViewer';
import { Database, FolderOpen, RefreshCw } from 'lucide-react';
import { useServiceManagement } from '@/hooks/useServiceManagement';

export function FolderBasedImportManager() {
  const {
    sectors,
    isImporting,
    importProgress,
    handleServiceImport,
    handleCancel,
    handleRefreshData
  } = useServiceManagement();
  
  return (
    <div className="space-y-6">
      {/* Live Bucket Viewer */}
      <LiveBucketViewer />

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Storage-Based Service Import
          </CardTitle>
          <CardDescription>
            Import service data from structured Excel files in storage folders organized by sector
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FreshServiceImport />
            
            <ServiceImportProgress 
              isImporting={isImporting}
              progress={importProgress.progress}
              stage={importProgress.stage}
              message={importProgress.message}
              onCancel={handleCancel}
              error={importProgress.error}
              completed={importProgress.completed}
              operation="import"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Manage imported service data and refresh the display
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleRefreshData}
              variant="outline"
              disabled={isImporting}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Service Data
            </Button>
            
            <div className="text-sm text-gray-600 flex items-center">
              Current: {sectors.length} sectors loaded
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
