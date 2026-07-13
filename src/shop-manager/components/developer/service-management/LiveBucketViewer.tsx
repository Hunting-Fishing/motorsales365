
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Folder, FileSpreadsheet, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { bucketViewerService } from '@/lib/services/bucketViewerService';
import type { SectorFiles } from '@/types/service';

export function LiveBucketViewer() {
  const [sectorFiles, setSectorFiles] = useState<SectorFiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBucketData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading live bucket data...');
      
      const sectors = await bucketViewerService.getAllSectorFiles();
      setSectorFiles(sectors);
      
      console.log('Live bucket data loaded:', sectors.length, 'sectors');
    } catch (err) {
      console.error('Error loading live bucket data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load live bucket data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBucketData();
  }, []);

  const totalFiles = sectorFiles.reduce((acc, sector) => acc + sector.totalFiles, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Live Storage Bucket Status
          </CardTitle>
          <Button
            onClick={loadBucketData}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-500">Loading live bucket data...</p>
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div><strong>Failed to load live bucket status:</strong></div>
                <div className="text-sm">{error}</div>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div><strong>Live Bucket Connected:</strong> service-data bucket is accessible</div>
                  <div><strong>Sectors loaded:</strong> {sectorFiles.length}</div>
                  <div><strong>Total Excel files:</strong> {totalFiles}</div>
                </div>
              </AlertDescription>
            </Alert>

            {sectorFiles.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Available Sectors:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sectorFiles.map((sector) => (
                    <div
                      key={sector.sectorName}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{sector.sectorName}</span>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <FileSpreadsheet className="h-3 w-3" />
                        {sector.totalFiles}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sectorFiles.length === 0 && (
              <Alert>
                <Folder className="h-4 w-4" />
                <AlertDescription>
                  No sectors or Excel files found in the service-data bucket. Upload some Excel files organized in folders to see them here.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
