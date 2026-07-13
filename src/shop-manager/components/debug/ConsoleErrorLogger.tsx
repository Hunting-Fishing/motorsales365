
import React, { useEffect } from 'react';

export const ConsoleErrorLogger = () => {
  useEffect(() => {
    // Override console.error to capture React errors
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      // Call original console.error first
      originalError.apply(console, args);
      
      // Check if this is a React error
      const errorMessage = args.join(' ');
      
      if (errorMessage.includes('Minified React error')) {
        console.log('🚨 React Error Detected:', {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          args: args
        });
        
        // Extract error codes from minified errors
        const errorCodeMatch = errorMessage.match(/error #(\d+)/);
        if (errorCodeMatch) {
          const errorCode = errorCodeMatch[1];
          console.log(`📚 React Error #${errorCode} - Visit https://react.dev/errors/${errorCode} for details`);
          
          // Log specific known error patterns
          switch (errorCode) {
            case '418':
              console.log('🔍 Error #418: Invalid React element type. Check for undefined components or incorrect imports.');
              console.log('💡 Common causes: Missing component exports, circular dependencies, extension interference');
              break;
            case '425':
              console.log('🔍 Error #425: Rendering non-React values. Check for null/undefined values being rendered.');
              console.log('💡 Common causes: Unguarded variable rendering, missing null checks');
              break;
            case '423':
              console.log('🔍 Error #423: setState called on unmounted component.');
              console.log('💡 Common causes: Async operations after unmount, missing cleanup in useEffect');
              break;
          }
        }
      }
      
      // Enhanced extension conflict detection
      if (errorMessage.includes('chrome-extension') || 
          errorMessage.includes('moz-extension') ||
          errorMessage.includes('Failed to execute \'querySelector\'') ||
          errorMessage.includes('insertBefore') ||
          errorMessage.includes('appendChild')) {
        console.log('🔌 Extension Conflict Detected:', {
          timestamp: new Date().toISOString(),
          message: errorMessage,
          context: 'extension_interference',
          suggestion: 'Extension is modifying DOM or blocking operations'
        });
      }
      
      // Check for notification-related errors
      if (errorMessage.includes('notification') || 
          errorMessage.includes('sound') || 
          errorMessage.includes('audio') ||
          errorMessage.includes('toast')) {
        console.log('🔔 Notification System Error:', {
          timestamp: new Date().toISOString(),
          message: errorMessage,
          context: 'notification_system'
        });
      }
      
      // Component lifecycle errors
      if (errorMessage.includes('setState') || 
          errorMessage.includes('useEffect') ||
          errorMessage.includes('unmounted')) {
        console.log('⚛️ Component Lifecycle Error:', {
          timestamp: new Date().toISOString(),
          message: errorMessage,
          context: 'component_lifecycle',
          suggestion: 'Check for proper cleanup and mounted state checks'
        });
      }
    };
    
    console.warn = (...args) => {
      // Call original console.warn first
      originalWarn.apply(console, args);
      
      const warnMessage = args.join(' ');
      
      // Log notification sound warnings specifically
      if (warnMessage.includes('notification sound') || 
          warnMessage.includes('audio') ||
          warnMessage.includes('playback')) {
        console.log('🔊 Audio/Sound Warning:', {
          timestamp: new Date().toISOString(),
          message: warnMessage,
          context: 'audio_system'
        });
      }
      
      // Log extension-related warnings
      if (warnMessage.includes('extension') || 
          warnMessage.includes('chrome-extension') ||
          warnMessage.includes('content script')) {
        console.log('🔌 Extension Warning:', {
          timestamp: new Date().toISOString(),
          message: warnMessage,
          context: 'extension_system'
        });
      }
    };

    // Enhanced unhandled error catching
    const handleUnhandledError = (event: ErrorEvent) => {
      console.log('🚨 Unhandled Error:', {
        timestamp: new Date().toISOString(),
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        context: 'unhandled_error'
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.log('🚨 Unhandled Promise Rejection:', {
        timestamp: new Date().toISOString(),
        reason: event.reason,
        context: 'unhandled_rejection'
      });
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup on unmount
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
};
