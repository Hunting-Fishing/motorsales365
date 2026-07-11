import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, HelpCircle } from 'lucide-react';
import { SubmitChangeRequestDialog } from '@/components/gunsmith/SubmitChangeRequestDialog';
import { useLocation } from 'react-router-dom';

export function AppFooter() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const location = useLocation();

  // Auto-detect module from current path
  const getDefaultModule = (): 'gunsmith' | 'power_washing' | 'automotive' | 'marine' | 'fuel_delivery' | 'general' => {
    const path = location.pathname;
    if (path.startsWith('/gunsmith')) return 'gunsmith';
    if (path.startsWith('/power-washing')) return 'power_washing';
    if (path.startsWith('/automotive')) return 'automotive';
    if (path.startsWith('/marine')) return 'marine';
    if (path.startsWith('/fuel-delivery')) return 'fuel_delivery';
    return 'general';
  };

  return (
    <>
      <footer className="border-t bg-background py-3 px-4 print:hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Left: Copyright */}
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} All Business 365. All rights reserved.
          </span>
          
          {/* Right: Links */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setFeedbackOpen(true)}
            >
              <MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />
              Feedback
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              asChild
            >
              <a href="/help" target="_blank" rel="noopener noreferrer">
                <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                Help
              </a>
            </Button>
          </div>
        </div>
      </footer>

      <SubmitChangeRequestDialog 
        open={feedbackOpen} 
        onOpenChange={setFeedbackOpen}
        defaultModule={getDefaultModule()}
      />
    </>
  );
}
