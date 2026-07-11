import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Clock, User, Database, Search } from 'lucide-react';
import { enterpriseService } from '@/services/enterpriseService';
import type { AuditTrail as AuditTrailType } from '@/types/phase4';

export const AuditTrail = () => {
  const [auditLogs, setAuditLogs] = useState<AuditTrailType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAuditTrail = async () => {
      try {
        const data = await enterpriseService.getAuditTrail();
        setAuditLogs(data);
      } catch (error) {
        console.error('Error fetching audit trail:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditTrail();
  }, []);

  const filteredLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.resource_id && log.resource_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>
            Complete audit log of all system activities and changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse border rounded-lg p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Audit Logs</h3>
              <p>No audit logs match your search criteria.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Database className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                          <span className="text-sm font-medium">{log.resource_type}</span>
                          {log.resource_id && (
                            <span className="text-xs text-muted-foreground">
                              ID: {log.resource_id.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                            {log.user_id && (
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                User ID: {log.user_id.slice(0, 8)}...
                              </span>
                            )}
                            {log.ip_address && (
                              <span>IP: {log.ip_address}</span>
                            )}
                          </div>
                        </div>
                        
                        {(log.old_values || log.new_values) && (
                          <details className="mt-3">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View Changes
                            </summary>
                            <div className="mt-2 text-xs space-y-2">
                              {log.old_values && (
                                <div>
                                  <span className="font-medium text-red-600">Before:</span>
                                  <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                    {JSON.stringify(log.old_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_values && (
                                <div>
                                  <span className="font-medium text-green-600">After:</span>
                                  <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                    {JSON.stringify(log.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};