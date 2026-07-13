
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { detectExtensionConflicts, initializeDOMProtection } from '@/utils/domProtection';

interface ConflictInfo {
  hasConflicts: boolean;
  extensionElements: number;
  modifiedGlobals: string[];
  suspiciousSelectors: string[];
}

export function ExtensionConflictDetector() {
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo>({
    hasConflicts: false,
    extensionElements: 0,
    modifiedGlobals: [],
    suspiciousSelectors: []
  });
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    initializeDOMProtection();
    scanForConflicts();
  }, []);

  const scanForConflicts = async () => {
    setIsScanning(true);
    
    try {
      // Check for extension elements
      const extensionElements = document.querySelectorAll('[id*="extension"], [class*="extension"], script[src*="chrome-extension"], script[src*="moz-extension"]');
      
      // Check for modified globals
      const modifiedGlobals: string[] = [];
      if ((window as any).chrome?.runtime) modifiedGlobals.push('chrome.runtime');
      if ((window as any).browser?.runtime) modifiedGlobals.push('browser.runtime');
      
      // Check for suspicious selectors that might be extension-generated
      const suspiciousSelectors: string[] = [];
      try {
        document.querySelector('.flex.items-center.gap-2, .flex.items-center.gap-1.5');
      } catch (error) {
        if (error instanceof DOMException) {
          suspiciousSelectors.push('.flex.items-center.gap-2, .flex.items-center.gap-1.5');
        }
      }
      
      const hasConflicts = detectExtensionConflicts();
      
      setConflictInfo({
        hasConflicts,
        extensionElements: extensionElements.length,
        modifiedGlobals,
        suspiciousSelectors
      });
    } catch (error) {
      console.error('Error scanning for conflicts:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const getStatusIcon = () => {
    if (isScanning) return <Shield className="h-5 w-5 animate-pulse text-blue-500" />;
    if (conflictInfo.hasConflicts) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (isScanning) return "Scanning for conflicts...";
    if (conflictInfo.hasConflicts) return "Extension conflicts detected";
    return "No conflicts detected";
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Extension Conflict Status</CardTitle>
        {getStatusIcon()}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={conflictInfo.hasConflicts ? "destructive" : "default"}>
              {getStatusText()}
            </Badge>
          </div>
          
          {conflictInfo.extensionElements > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Extension Elements</span>
              <Badge variant="outline">{conflictInfo.extensionElements}</Badge>
            </div>
          )}
          
          {conflictInfo.modifiedGlobals.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Modified Globals</span>
              <div className="mt-1 space-y-1">
                {conflictInfo.modifiedGlobals.map(global => (
                  <Badge key={global} variant="outline" className="text-xs">
                    {global}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {conflictInfo.suspiciousSelectors.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Problematic Selectors</span>
              <div className="mt-1 space-y-1">
                {conflictInfo.suspiciousSelectors.map(selector => (
                  <Badge key={selector} variant="destructive" className="text-xs">
                    Invalid CSS selector
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <button 
            onClick={scanForConflicts}
            disabled={isScanning}
            className="w-full text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {isScanning ? 'Scanning...' : 'Rescan'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
