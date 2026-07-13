
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Cloud, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface FileWithProgress {
  file: File;
  progress: number;
  timeRemaining?: string;
  uploading: boolean;
}

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFiles?: number;
  currentFiles?: File[];
  onUploadProgress?: (fileName: string, progress: number) => void;
}

export function FileUploader({
  onFilesSelected,
  acceptedFileTypes = ['.xlsx', '.xls', '.csv', '.json'],
  maxFiles = 5,
  currentFiles = [],
  onUploadProgress
}: FileUploaderProps) {
  const [filesWithProgress, setFilesWithProgress] = useState<FileWithProgress[]>(
    (currentFiles || []).map(file => ({ file, progress: 100, uploading: false }))
  );

  const simulateUpload = async (fileWithProgress: FileWithProgress) => {
    const startTime = Date.now();
    const fileSize = fileWithProgress.file.size;
    
    for (let progress = 0; progress <= 100; progress += 5) {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = (fileSize * (progress / 100)) / elapsed;
      const remaining = ((fileSize - (fileSize * (progress / 100))) / speed);
      
      const timeRemaining = remaining > 60 
        ? `${Math.ceil(remaining / 60)}m ${Math.ceil(remaining % 60)}s`
        : `${Math.ceil(remaining)}s`;
      
      setFilesWithProgress(prev => 
        prev.map(f => 
          f.file === fileWithProgress.file 
            ? { ...f, progress, timeRemaining: progress < 100 ? timeRemaining : undefined }
            : f
        )
      );
      
      onUploadProgress?.(fileWithProgress.file.name, progress);
    }
    
    setFilesWithProgress(prev => 
      prev.map(f => 
        f.file === fileWithProgress.file 
          ? { ...f, uploading: false }
          : f
      )
    );
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFilesWithProgress: FileWithProgress[] = acceptedFiles
      .slice(0, maxFiles - filesWithProgress.length)
      .map(file => ({ file, progress: 0, uploading: true }));
    
    setFilesWithProgress(prev => [...prev, ...newFilesWithProgress]);
    
    const allFiles = [...filesWithProgress.map(f => f.file), ...newFilesWithProgress.map(f => f.file)];
    onFilesSelected(allFiles);
    
    newFilesWithProgress.forEach(fileWithProgress => {
      simulateUpload(fileWithProgress);
    });
  }, [filesWithProgress, maxFiles, onFilesSelected, onUploadProgress]);

  const removeFile = (fileToRemove: File) => {
    const filtered = filesWithProgress.filter(f => f.file !== fileToRemove);
    setFilesWithProgress(filtered);
    onFilesSelected(filtered.map(f => f.file));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes ? acceptedFileTypes.reduce((acc, type) => {
      if (type.startsWith('.')) {
        // Convert file extension to MIME type if possible
        const mimeType = 
          type === '.xlsx' || type === '.xls' ? { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [] } :
          type === '.csv' ? { 'text/csv': [] } :
          type === '.json' ? { 'application/json': [] } :
          { [type]: [] };
        return { ...acc, ...mimeType };
      }
      return { ...acc, [type]: [] };
    }, {}) : undefined,
    maxFiles: maxFiles - filesWithProgress.length,
  });

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch(extension) {
      case 'xlsx':
      case 'xls':
        return <File className="h-6 w-6 text-green-500" />;
      case 'csv':
        return <File className="h-6 w-6 text-blue-500" />;
      case 'json':
        return <File className="h-6 w-6 text-amber-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-primary hover:bg-primary/5'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Cloud className="h-10 w-10 text-gray-400" />
          <p className="text-sm font-medium">
            {isDragActive
              ? 'Drop the files here...'
              : `Drag & drop files here, or click to select`
            }
          </p>
          <p className="text-xs text-gray-500">
            {acceptedFileTypes?.join(', ')} (Max {maxFiles} files)
          </p>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            Select Files
          </Button>
        </div>
      </div>

      {filesWithProgress.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Selected Files ({filesWithProgress.length})</p>
          <ul className="space-y-3">
            {filesWithProgress.map((fileWithProgress, index) => (
              <li 
                key={`${fileWithProgress.file.name}-${index}`}
                className="p-3 bg-card rounded-md border space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(fileWithProgress.file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fileWithProgress.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(fileWithProgress.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-8 w-8 p-0 flex-shrink-0"
                    onClick={() => removeFile(fileWithProgress.file)}
                    disabled={fileWithProgress.uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {fileWithProgress.uploading && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Uploading...</span>
                      <div className="flex items-center gap-2">
                        {fileWithProgress.timeRemaining && (
                          <span className="text-muted-foreground">
                            {fileWithProgress.timeRemaining} remaining
                          </span>
                        )}
                        <span className="font-medium">{Math.round(fileWithProgress.progress)}%</span>
                      </div>
                    </div>
                    <Progress value={fileWithProgress.progress} className="h-2" />
                  </div>
                )}
                
                {!fileWithProgress.uploading && fileWithProgress.progress === 100 && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <span>✓</span>
                    <span>Upload complete</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
