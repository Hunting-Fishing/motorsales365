import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { useSystemTaxIntegration } from '@/hooks/useSystemTaxIntegration';

interface TaxSystemStatusCardProps {
  shopId?: string;
  className?: string;
}

export function TaxSystemStatusCard({ shopId, className }: TaxSystemStatusCardProps) {
  const { 
    systemStatus, 
    moduleStatus, 
    validation, 
    metrics,
    loading 
  } = useSystemTaxIntegration({ shopId });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'configured':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warnings':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'invalid':
      case 'not_configured':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured':
        return 'bg-green-100 text-green-800';
      case 'warnings':
        return 'bg-yellow-100 text-yellow-800';
      case 'invalid':
      case 'not_configured':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {getStatusIcon(systemStatus)}
          Tax System Status
          <Badge className={getStatusColor(systemStatus)}>
            {systemStatus.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Overview */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Configuration:</span>
            <div className="font-medium">
              {metrics.configuredModules}/{metrics.moduleCount} modules
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <div className="font-medium capitalize">
              {systemStatus.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Module Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Module Integration</h4>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(moduleStatus).map(([module, configured]) => (
              <div key={module} className="flex items-center gap-1">
                {configured ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span className="capitalize">{module}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Messages */}
        {validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-1">
                {validation.errors.map((error, index) => (
                  <div key={index} className="text-xs">{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {validation.warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="text-xs">{warning}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}