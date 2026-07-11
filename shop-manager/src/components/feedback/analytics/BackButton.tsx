
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
}

export const BackButton: React.FC<BackButtonProps> = ({ onClick }) => {
  return (
    <Button variant="ghost" onClick={onClick}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back to Forms
    </Button>
  );
};
