
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Folder, AlertCircle, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface StorageFileBrowserProps {
  bucketName: string;
  onFileSelect: (filePath: string) => void;
}

interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  };
}

interface FolderStructure {
  [folderName: string]: StorageFile[];
}

export const StorageFileBrowser: React.FC<StorageFileBrowserProps> = ({ 
  bucketName, 
  onFileSelect 
}) => {
  const [folders, setFolders] = useState<FolderStructure>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string>('');

  const loadFoldersAndFiles = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log(`Loading folders and files from bucket: ${bucketName}`);
      
      // List all files in the bucket (recursive)
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list('', {
          limit: 1000,
          offset: 0,
          search: ''
        });

      if (error) {
        console.error('Storage list error:', error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} items:`, data);
      
      // Organize files by folders
      const folderStructure: FolderStructure = {};
      
      if (data) {
        // First, get all folders (directories)
        const folders = data.filter(item => !item.name.includes('.'));
        
        // For each folder, get its files
        for (const folder of folders) {
          try {
            const { data: folderFiles, error: folderError } = await supabase.storage
              .from(bucketName)
              .list(folder.name, {
                limit: 100,
                offset: 0
              });

            if (folderError) {
              console.error(`Error loading files from folder ${folder.name}:`, folderError);
              continue;
            }

            // Filter for supported file types
            const supportedFiles = (folderFiles || []).filter(file => {
              const extension = file.name.split('.').pop()?.toLowerCase();
              return ['csv', 'json', 'xlsx', 'xls'].includes(extension || '');
            });

            if (supportedFiles.length > 0) {
              folderStructure[folder.name] = supportedFiles;
            }
          } catch (err) {
            console.error(`Error processing folder ${folder.name}:`, err);
          }
        }

        // Also check for files in root directory
        const rootFiles = data.filter(item => {
          const extension = item.name.split('.').pop()?.toLowerCase();
          return ['csv', 'json', 'xlsx', 'xls'].includes(extension || '');
        });

        if (rootFiles.length > 0) {
          folderStructure['Root'] = rootFiles;
        }
      }

      setFolders(folderStructure);
      
      if (Object.keys(folderStructure).length === 0) {
        setError('No supported files found. Please upload CSV, JSON, or Excel files organized in sector folders (e.g., Automotive, Lawn-Care, Marine).');
      }
    } catch (error) {
      console.error('Failed to load folders and files:', error);
      setError(error instanceof Error ? error.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bucketName) {
      loadFoldersAndFiles();
    }
  }, [bucketName]);

  const toggleFolder = (folderName: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileSelect = (folderName: string, fileName: string) => {
    const filePath = folderName === 'Root' ? fileName : `${folderName}/${fileName}`;
    setSelectedFile(filePath);
    onFileSelect(filePath);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const totalFolders = Object.keys(folders).length;
  const totalFiles = Object.values(folders).reduce((acc, files) => acc + files.length, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Folder className="h-5 w-5 mr-2" />
            Service Import Files ({bucketName})
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadFoldersAndFiles}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {totalFolders > 0 && (
          <p className="text-sm text-gray-600">
            {totalFolders} folders • {totalFiles} files
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
            <p className="mt-2 text-sm text-gray-600">Loading folders and files...</p>
          </div>
        ) : Object.keys(folders).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(folders).map(([folderName, files]) => (
              <div key={folderName} className="border rounded-lg">
                <div
                  className="flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b"
                  onClick={() => toggleFolder(folderName)}
                >
                  {expandedFolders.has(folderName) ? (
                    <ChevronDown className="h-4 w-4 mr-2 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2 text-gray-500" />
                  )}
                  <Folder className="h-4 w-4 mr-2 text-blue-500" />
                  <div className="flex-grow">
                    <p className="font-medium text-sm">{folderName}</p>
                    <p className="text-xs text-gray-500">{files.length} files</p>
                  </div>
                </div>
                
                {expandedFolders.has(folderName) && (
                  <div className="p-2 space-y-1">
                    {files.map((file) => {
                      const filePath = folderName === 'Root' ? file.name : `${folderName}/${file.name}`;
                      return (
                        <div
                          key={file.id}
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            selectedFile === filePath
                              ? 'bg-blue-50 border border-blue-200'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleFileSelect(folderName, file.name)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <FileText className="h-3 w-3 mr-2 text-gray-400" />
                              <div>
                                <p className="font-medium text-xs">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(file.metadata?.size)} • {formatDate(file.updated_at)}
                                </p>
                              </div>
                            </div>
                            {selectedFile === filePath && (
                              <div className="text-blue-600 text-xs font-medium">Selected</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : !loading && (
          <div className="text-center py-8 text-gray-500">
            <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No sector folders found in this bucket</p>
            <p className="text-sm">
              Create folders for different sectors (e.g., Automotive, Lawn-Care, Marine) and upload your service files
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
