
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaperclipIcon } from 'lucide-react';
import { uploadChatFile } from '@/services/chat/fileService';
import { toast } from '@/hooks/use-toast';

interface FileUploadButtonProps {
  roomId: string;
  onFileUploaded: (fileUrl: string, fileType: string, caption?: string) => void;
  isDisabled?: boolean;
}

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  roomId,
  onFileUploaded,
  isDisabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId) return;

    try {
      setIsUploading(true);
      
      const fileInfo = await uploadChatFile(roomId, file);
      
      if (fileInfo) {
        onFileUploaded(`${fileInfo.type}:${fileInfo.url}`, fileInfo.type);
        toast({
          title: "File uploaded",
          description: "Your file has been attached to the conversation"
        });
      }
      
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileUpload}
        accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleFileButtonClick}
        disabled={isDisabled || isUploading}
        className="rounded-full"
      >
        <PaperclipIcon className={`h-5 w-5 ${isUploading ? 'text-slate-400 animate-pulse' : ''}`} />
        <span className="sr-only">Attach file</span>
      </Button>
    </>
  );
};
