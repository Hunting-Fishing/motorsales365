
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { EnhancedErrorBoundary } from '../error/EnhancedErrorBoundary';
import { protectElement, initializeDOMProtection, detectExtensionConflicts } from '@/utils/domProtection';
import { AlertTriangle, Shield } from 'lucide-react';

interface SafeComponentWrapperProps {
  children: ReactNode;
  componentName?: string;
  enableDOMProtection?: boolean;
  enableIsolation?: boolean;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

export function SafeComponentWrapper({
  children,
  componentName = 'Component',
  enableDOMProtection = true,
  enableIsolation = false,
  fallback,
  onError
}: SafeComponentWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasExtensionConflict, setHasExtensionConflict] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // Initialize DOM protection on mount
    if (enableDOMProtection) {
      initializeDOMProtection();
    }

    // Check for extension conflicts
    const conflictDetected = detectExtensionConflicts();
    setHasExtensionConflict(conflictDetected);

    if (conflictDetected) {
      console.warn(`🔌 Extension conflicts detected for ${componentName}`);
    }

    // Protect the container element
    if (containerRef.current && enableDOMProtection) {
      protectElement(containerRef.current);
    }
  }, [enableDOMProtection, componentName]);

  const handleError = (error: Error) => {
    console.error(`❌ Error in ${componentName}:`, error);
    
    // Check if this might be an extension-related error
    const isExtensionError = error.message?.includes('chrome-extension') ||
                            error.message?.includes('querySelector') ||
                            error.message?.includes('Failed to execute');
    
    if (isExtensionError) {
      setIsRecovering(true);
      setTimeout(() => setIsRecovering(false), 2000);
    }

    if (onError) {
      onError(error);
    }
  };

  const defaultFallback = (
    <div className="flex items-center justify-center p-4 border rounded-lg bg-slate-50">
      <div className="text-center">
        {hasExtensionConflict ? (
          <>
            <Shield className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">
              {componentName} is recovering from extension interference
            </p>
          </>
        ) : (
          <>
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">
              {componentName} temporarily unavailable
            </p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={enableIsolation ? 'isolate' : undefined}
      data-component={componentName}
      data-protected={enableDOMProtection ? 'true' : undefined}
      style={enableIsolation ? { isolation: 'isolate', contain: 'layout style' } : undefined}
    >
      <EnhancedErrorBoundary
        fallback={fallback || defaultFallback}
        onError={handleError}
        maxRetries={3}
        isolateOnError={enableIsolation}
      >
        {isRecovering ? (
          <div className="flex items-center justify-center p-2">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 animate-pulse" />
              <span>Recovering...</span>
            </div>
          </div>
        ) : (
          children
        )}
      </EnhancedErrorBoundary>
    </div>
  );
}
