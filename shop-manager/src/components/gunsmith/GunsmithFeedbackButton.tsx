import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import { SubmitChangeRequestDialog } from './SubmitChangeRequestDialog';

export function GunsmithFeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-20 md:bottom-6 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-amber-500 hover:bg-amber-600 text-white"
        aria-label="Submit Feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </Button>
      <SubmitChangeRequestDialog 
        open={open} 
        onOpenChange={setOpen}
        defaultModule="gunsmith"
      />
    </>
  );
}
