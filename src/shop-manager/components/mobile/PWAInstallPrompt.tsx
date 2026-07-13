import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function PWAInstallPrompt({ onInstall, onDismiss }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { isMobile } = useResponsive();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after a delay if on mobile
      if (isMobile) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isMobile]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      onInstall?.();
    }

    // Clear the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
    
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already installed or dismissed or not available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  // Check if dismissed in this session
  if (sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-lg border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 animate-slide-in-bottom">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              Install App
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Install our app for a better experience with offline access and faster loading.
            </p>
            
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={handleInstallClick}
                className="text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Install
              </Button>
              
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="text-xs"
              >
                Not now
              </Button>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="p-1 h-6 w-6"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}