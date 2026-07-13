import { useState, useEffect } from 'react';

interface DeviceCapabilities {
  hasCamera: boolean;
  hasGeolocation: boolean;
  hasShare: boolean;
  hasVibration: boolean;
  hasNotifications: boolean;
  canInstall: boolean;
  isStandalone: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    hasCamera: false,
    hasGeolocation: false,
    hasShare: false,
    hasVibration: false,
    hasNotifications: false,
    canInstall: false,
    isStandalone: false,
    isMobile: false,
    isIOS: false,
    isAndroid: false
  });

  useEffect(() => {
    const checkCapabilities = async () => {
      // Check for camera access
      const hasCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      // Check for geolocation
      const hasGeolocation = !!navigator.geolocation;
      
      // Check for native share API
      const hasShare = !!navigator.share;
      
      // Check for vibration API
      const hasVibration = !!navigator.vibrate;
      
      // Check for notifications
      const hasNotifications = 'Notification' in window;
      
      // Check if app can be installed (PWA)
      const canInstall = 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
      
      // Check if running in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;
      
      // Detect device type
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      
      setCapabilities({
        hasCamera,
        hasGeolocation,
        hasShare,
        hasVibration,
        hasNotifications,
        canInstall,
        isStandalone,
        isMobile,
        isIOS,
        isAndroid
      });
    };

    checkCapabilities();
  }, []);

  const requestNotificationPermission = async () => {
    if (!capabilities.hasNotifications) return false;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  };

  const vibrate = (pattern: number | number[]) => {
    if (capabilities.hasVibration) {
      navigator.vibrate(pattern);
    }
  };

  const share = async (data: ShareData) => {
    if (capabilities.hasShare) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        console.error('Share failed:', error);
        return false;
      }
    }
    return false;
  };

  return {
    ...capabilities,
    requestNotificationPermission,
    vibrate,
    share
  };
}