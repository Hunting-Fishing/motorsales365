
import React from 'react';
import { ChatFileInfo } from '@/services/chat/fileService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileIcon, Image as ImageIcon, Film, FileAudio, FileText } from 'lucide-react';

interface ChatFileMessageProps {
  fileInfo: ChatFileInfo;
  caption?: string;
}

export const ChatFileMessage: React.FC<ChatFileMessageProps> = ({ fileInfo, caption }) => {
  const handleDownload = () => {
    window.open(fileInfo.url, '_blank');
  };

  // Render based on file type
  const renderFileContent = () => {
    switch (fileInfo.type) {
      case 'image':
        return (
          <div className="relative group">
            <img 
              src={fileInfo.url} 
              alt={caption || 'Image'} 
              className="rounded-md max-h-64 max-w-full object-contain"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button 
                variant="secondary" 
                size="sm" 
                className="gap-1" 
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
            </div>
          </div>
        );
        
      case 'audio':
        return (
          <div className="w-full">
            <audio controls className="w-full">
              <source src={fileInfo.url} type={fileInfo.contentType} />
              Your browser does not support the audio element.
            </audio>
          </div>
        );
        
      case 'video':
        return (
          <div className="w-full">
            <video 
              controls 
              className="rounded-md max-h-64 max-w-full"
            >
              <source src={fileInfo.url} type={fileInfo.contentType} />
              Your browser does not support the video element.
            </video>
          </div>
        );
        
      case 'document':
        let icon = <FileText className="h-10 w-10 text-blue-500" />;
        if (fileInfo.contentType === 'application/pdf') {
          icon = <FileIcon className="h-10 w-10 text-red-500" />;
        }
        
        return (
          <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-md">
            {icon}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{fileInfo.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(fileInfo.size)}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              className="flex-shrink-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );
        
      default:
        return (
          <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-md">
            <FileIcon className="h-10 w-10 text-slate-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{fileInfo.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(fileInfo.size)}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              className="flex-shrink-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );
    }
  };

  return (
    <Card className="p-2 bg-transparent border-none shadow-none">
      {renderFileContent()}
      {caption && <p className="mt-1 text-sm text-slate-600">{caption}</p>}
    </Card>
  );
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
