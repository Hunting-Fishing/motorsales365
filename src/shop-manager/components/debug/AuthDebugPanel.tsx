import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RefreshCw, Bug, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAuthDebugger } from '@/hooks/useAuthDebugger';
import { useSessionRecovery } from '@/hooks/useSessionRecovery';
import { useAuthUser } from '@/hooks/useAuthUser';

export function AuthDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  
  const { debugInfo, refreshDebugInfo } = useAuthDebugger();
  const { attemptSessionRecovery } = useSessionRecovery();
  const { user, session, isAuthenticated, error } = useAuthUser();

  const handleSessionRecovery = async () => {
    setIsRecovering(true);
    try {
      const result = await attemptSessionRecovery({ maxRetries: 3 });
      console.log('Session recovery result:', result);
      
      // Refresh debug info after recovery attempt
      setTimeout(() => {
        refreshDebugInfo();
      }, 1000);
    } finally {
      setIsRecovering(false);
    }
  };

  const StatusBadge = ({ condition, trueText, falseText }: {
    condition: boolean;
    trueText: string;
    falseText: string;
  }) => (
    <Badge variant={condition ? "default" : "destructive"} className="gap-1">
      {condition ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {condition ? trueText : falseText}
    </Badge>
  );

  // Only show in development or if there are auth issues
  if (process.env.NODE_ENV === 'production' && isAuthenticated && !error) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 bg-background/95 backdrop-blur-sm border-2"
          >
            <Bug className="h-4 w-4" />
            Auth Debug
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            {!isAuthenticated && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                Authentication Status
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={refreshDebugInfo}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4 text-xs">
              {/* Current Auth State */}
              <div className="space-y-2">
                <h4 className="font-medium">Current State</h4>
                <div className="flex flex-wrap gap-1">
                  <StatusBadge 
                    condition={isAuthenticated} 
                    trueText="Authenticated" 
                    falseText="Not Authenticated" 
                  />
                  <StatusBadge 
                    condition={debugInfo.sessionValid} 
                    trueText="Session Valid" 
                    falseText="Session Invalid" 
                  />
                  {user && (
                    <Badge variant="outline">
                      User: {user.email?.substring(0, 10)}...
                    </Badge>
                  )}
                </div>
                
                {error && (
                  <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive">
                    Error: {error}
                  </div>
                )}
              </div>

              {/* Session Info */}
              <div className="space-y-2">
                <h4 className="font-medium">Session Info</h4>
                <div className="space-y-1 text-xs">
                  {debugInfo.tokenExpiry && (
                    <div>Token expires: {new Date(debugInfo.tokenExpiry).toLocaleString()}</div>
                  )}
                  {debugInfo.lastAuthEvent && (
                    <div>Last event: {debugInfo.lastAuthEvent}</div>
                  )}
                  <div>Storage keys: {debugInfo.localStorageKeys.length} local, {debugInfo.sessionStorageKeys.length} session</div>
                </div>
              </div>

              {/* Recent Auth Events */}
              {debugInfo.sessionHistory.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Recent Events</h4>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {debugInfo.sessionHistory.slice(0, 3).map((event, idx) => (
                      <div key={idx} className="text-xs p-1 bg-muted rounded">
                        {new Date(event.timestamp).toLocaleTimeString()}: {event.event}
                        {event.userId && ` (${event.userId.substring(0, 8)}...)`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auth Errors */}
              {debugInfo.authErrors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive">Recent Errors</h4>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {debugInfo.authErrors.slice(0, 2).map((error, idx) => (
                      <div key={idx} className="text-xs p-1 bg-destructive/10 border border-destructive/20 rounded text-destructive">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recovery Actions */}
              <div className="space-y-2">
                <h4 className="font-medium">Recovery Actions</h4>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSessionRecovery}
                    disabled={isRecovering}
                    className="text-xs"
                  >
                    {isRecovering ? 'Recovering...' : 'Recover Session'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.reload()}
                    className="text-xs"
                  >
                    Reload Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}