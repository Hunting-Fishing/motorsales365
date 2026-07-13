
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, Square, Send } from "lucide-react";
import { cn } from '@/lib/utils';

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  isDisabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  onAudioRecorded,
  isDisabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds += 1;
        setRecordingDuration(seconds);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please ensure it is connected and permissions are granted.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingDuration(0);
  };

  // Send recorded audio
  const sendAudio = () => {
    if (audioBlob) {
      onAudioRecorded(audioBlob);
      setAudioBlob(null);
      setRecordingDuration(0);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 bg-red-100 dark:bg-red-900/30 rounded-full px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="animate-pulse bg-red-500 h-3 w-3 rounded-full"></span>
            <span>{formatTime(recordingDuration)}</span>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={cancelRecording}
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>
        <Button 
          size="icon" 
          onClick={stopRecording}
          className="bg-red-500 hover:bg-red-600"
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2">
          <audio src={URL.createObjectURL(audioBlob)} controls className="w-full h-10" />
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={cancelRecording}
          className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button 
          size="icon" 
          onClick={sendAudio}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("rounded-full", isDisabled && "opacity-50 cursor-not-allowed")}
      onClick={startRecording}
      disabled={isDisabled}
    >
      <Mic className="h-5 w-5" />
      <span className="sr-only">Record voice message</span>
    </Button>
  );
};
