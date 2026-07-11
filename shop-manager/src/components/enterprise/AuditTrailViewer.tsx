import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Calendar, User, Activity } from 'lucide-react';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AuditTrailViewer() {
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('');
  const { loading, auditLogs } = useAuditTrail({ 
    resourceType: resourceTypeFilter || undefined 
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const uniqueResourceTypes = Array.from(
    new Set(auditLogs.map(log => log.resource_type))
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <CardTitle>Audit Trail</CardTitle>
        </div>
        <CardDescription>
          View system activity and changes
        </CardDescription>
        <div className="flex gap-2 mt-4">
          <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Resource Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Resource Types</SelectItem>
              {uniqueResourceTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{log.action}</span>
                      <span className="text-muted-foreground">on</span>
                      <span className="font-medium">{log.resource_type}</span>
                    </div>
                    {log.resource_id && (
                      <div className="text-xs text-muted-foreground mb-1">
                        Resource ID: <span className="font-mono">{log.resource_id}</span>
                      </div>
                    )}
                    {log.ip_address && (
                      <div className="text-xs text-muted-foreground">
                        IP: {log.ip_address}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 justify-end mb-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                    </div>
                    {log.user_id && (
                      <div className="flex items-center gap-1 justify-end">
                        <User className="h-3 w-3" />
                        <span className="font-mono text-[10px]">{log.user_id.slice(0, 8)}...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
