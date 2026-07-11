import { useState, useEffect } from 'react';

interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAHookReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  installPrompt: PWAInstallPrompt | null;
  install: () => Promise<boolean>;
  isOffline: boolean;
  updateAvailable: boolean;
  updateServiceWorker: () => void;
}

export function usePWA(): PWAHookReturn {
  const [installPrompt, setInstallPrompt] = useState<PWAInstallPrompt | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if app is running in standalone mode - use state to avoid SSR issues
  const [isStandalone] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone === true;
    }
    return false;
  });

  // Check if app is installable
  const isInstallable = !!installPrompt && !isInstalled && !isStandalone;

  useEffect(() => {
    const isLovableHosted =
      window.location.hostname.includes('lovable.app') ||
      window.location.hostname.includes('lovableproject.com');
    const isPreviewSession = window.location.search.includes('__lovable_token=');
    const shouldRegisterServiceWorker = import.meta.env.PROD && !isLovableHosted && !isPreviewSession;

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as any);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    // Listen for online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
        setUpdateAvailable(true);
      }
    };

    const cleanupLegacyServiceWorkers = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));

        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(
            cacheKeys
              .filter((key) => key.startsWith('order-master-'))
              .map((key) => caches.delete(key))
          );
        }
      } catch (error) {
        console.warn('Service worker cleanup failed:', error);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if already installed
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Register service worker only outside Lovable-hosted/preview environments
    if ('serviceWorker' in navigator) {
      if (!shouldRegisterServiceWorker) {
        cleanupLegacyServiceWorkers();
      } else {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            setRegistration(registration);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setUpdateAvailable(true);
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error('Service worker registration failed:', error);
          });

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [isStandalone]);

  const install = async (): Promise<boolean> => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
        return true;
      }
    } catch (error) {
      console.error('Installation failed:', error);
    }

    return false;
  };

  const updateServiceWorker = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return {
    isInstallable,
    isInstalled,
    isStandalone,
    installPrompt,
    install,
    isOffline,
    updateAvailable,
    updateServiceWorker
  };
}