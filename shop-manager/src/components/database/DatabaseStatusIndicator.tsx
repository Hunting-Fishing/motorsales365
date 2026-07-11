
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { databaseHealthMonitor } from '@/services/database/DatabaseHealthMonitor';

export function DatabaseStatusIndicator() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const diagnostics = await databaseHealthMonitor.getDiagnostics();
        setHealthStatus(diagnostics);
      } catch (error) {
        console.error('Failed to get database health:', error);
        setHealthStatus({ status: 'error', message: 'Health check failed' });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await databaseHealthMonitor.runHealthCheck();
      const diagnostics = await databaseHealthMonitor.getDiagnostics();
      setHealthStatus(diagnostics);
    } catch (error) {
      console.error('Failed to refresh health status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-600">Checking database health...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center space-x-2">
            {getStatusIcon(healthStatus?.status || 'unknown')}
            <span>Database Status</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(healthStatus?.status || 'unknown')}>
            {healthStatus?.status?.toUpperCase() || 'UNKNOWN'}
          </Badge>
          <span className="text-sm text-gray-600">
            {healthStatus?.message || 'Status unknown'}
          </span>
        </div>

        {/* Database Status */}
        <div className="bg-green-50 p-3 rounded-lg space-y-2">
          <h4 className="font-medium text-green-900 text-sm">Live Database Connection</h4>
          <div className="text-xs text-green-600">
            All work order data is now fetched directly from the live database
          </div>
        </div>

        {/* Health Checks */}
        {healthStatus?.checks && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Health Checks</h4>
            <div className="space-y-1">
              {Object.entries(healthStatus.checks).map(([check, result]: [string, any]) => (
                <div key={check} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{check.replace(/_/g, ' ')}</span>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(result.status)}
                    <span className={`font-mono ${
                      result.status === 'healthy' ? 'text-green-600' : 
                      result.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
