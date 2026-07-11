import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { enterpriseService } from '@/services/enterpriseService';
import type { SecurityEvent } from '@/types/phase4';

export const SecurityManagement = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSecurityEvents = async () => {
      try {
        const data = await enterpriseService.getSecurityEvents();
        setEvents(data);
      } catch (error) {
        console.error('Error fetching security events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityEvents();
  }, []);

  const handleResolveEvent = async (eventId: string) => {
    try {
      await enterpriseService.resolveSecurityEvent(eventId, 'current-user-id');
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, resolved: true, resolved_at: new Date().toISOString() }
          : event
      ));
    } catch (error) {
      console.error('Error resolving security event:', error);
    }
  };

  const severityConfig = {
    low: { icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
    medium: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    high: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    critical: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' }
  };

  const unresolvedEvents = events.filter(event => !event.resolved);
  const criticalEvents = unresolvedEvents.filter(event => event.severity === 'critical');

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unresolvedEvents.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalEvents.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {unresolvedEvents.length === 0 ? 100 : Math.max(60, 100 - unresolvedEvents.length * 5)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalEvents.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Critical Security Events</AlertTitle>
          <AlertDescription className="text-red-700">
            You have {criticalEvents.length} critical security events that require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
          <CardDescription>
            Recent security events and alerts requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse border rounded-lg p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-medium mb-2">No Security Events</h3>
              <p>Your system is secure. No security events have been detected.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => {
                const config = severityConfig[event.severity];
                const Icon = config.icon;
                
                return (
                  <div
                    key={event.id}
                    className={`border rounded-lg p-4 ${event.resolved ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="outline" className="capitalize">
                              {event.event_type}
                            </Badge>
                            <Badge 
                              variant={event.severity === 'critical' ? 'destructive' : 'secondary'}
                              className="capitalize"
                            >
                              {event.severity}
                            </Badge>
                            {event.resolved && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium text-sm mb-1">
                            {event.description || `${event.event_type} event detected`}
                          </h4>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center space-x-4">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(event.created_at).toLocaleString()}
                              </span>
                              {event.ip_address && (
                                <span>IP: {event.ip_address}</span>
                              )}
                            </div>
                            {event.resolved_at && (
                              <div className="text-green-600">
                                Resolved on {new Date(event.resolved_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!event.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveEvent(event.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};