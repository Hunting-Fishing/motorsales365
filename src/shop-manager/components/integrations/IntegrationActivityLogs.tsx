
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from 'date-fns';

interface WebhookLog {
  id: string;
  webhook_type: string | null;
  webhook_url: string | null;
  payload: unknown;
  response_status: number | null;
  response_body: string | null;
  success: boolean | null;
  error_message: string | null;
  created_at: string | null;
}

export function IntegrationActivityLogs() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading webhook logs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (success: boolean | null, status: number | null) => {
    if (success === true) {
      return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Success</Badge>;
    } else if (success === false) {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getStatusIcon = (success: boolean | null) => {
    if (success === true) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (success === false) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Integration Activity Logs</CardTitle>
          <CardDescription>Recent webhook and integration events</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => loadLogs(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No activity logs yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Webhook and integration events will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="mt-1">
                  {getStatusIcon(log.success)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{log.webhook_type}</span>
                    {getStatusBadge(log.success, log.response_status)}
                    {log.response_status && (
                      <Badge variant="outline">HTTP {log.response_status}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {log.webhook_url}
                  </p>
                  {log.error_message && (
                    <p className="text-sm text-destructive mt-1">
                      {log.error_message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {log.created_at 
                      ? format(new Date(log.created_at), 'MMM d, yyyy h:mm:ss a')
                      : 'Unknown time'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
