import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Code, Play, Key, Webhook, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function ApiToolsPage() {
  const [testRequest, setTestRequest] = useState({ method: 'GET', endpoint: '/api/customers', headers: '', body: '' });
  const [testResponse, setTestResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [apiMetrics, setApiMetrics] = useState({ totalRequests: 0, successRate: 0, avgResponseTime: 0, rateLimitHits: 0 });
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    fetchWebhookLogs();
    fetchApiMetrics();
  }, []);

  const fetchWebhookLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data } = await supabase.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(10);
      setWebhookLogs(data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingLogs(false); }
  };

  const fetchApiMetrics = async () => {
    try {
      const { data: logs } = await supabase.from('webhook_logs').select('success').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      const total = logs?.length || 0;
      const successful = logs?.filter(l => l.success).length || 0;
      setApiMetrics({ totalRequests: total, successRate: total > 0 ? Number(((successful / total) * 100).toFixed(1)) : 0, avgResponseTime: 150, rateLimitHits: 0 });
    } catch (e) { console.error(e); }
  };

  const handleTestRequest = async () => {
    setLoading(true);
    try {
      if (testRequest.endpoint.includes('customers')) {
        const { data } = await supabase.from('customers').select('id, first_name, last_name, email, created_at').limit(10);
        setTestResponse(JSON.stringify({ status: 200, data: data || [], meta: { total: data?.length || 0 } }, null, 2));
        toast.success('Request completed');
      } else {
        setTestResponse(JSON.stringify({ error: 'Endpoint not found' }, null, 2));
      }
    } catch (e: any) { setTestResponse(JSON.stringify({ error: e.message }, null, 2)); }
    finally { setLoading(false); }
  };

  const generateApiKey = () => {
    const key = 'asp_' + crypto.randomUUID().replace(/-/g, '').substring(0, 30);
    toast.success('API key generated: ' + key);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Code className="h-8 w-8 text-green-600" /><div><h1 className="text-3xl font-bold">API Tools</h1><p className="text-muted-foreground">Test endpoints, manage keys, and monitor usage</p></div></div>
      <Tabs defaultValue="playground" className="space-y-6">
        <TabsList><TabsTrigger value="playground">Playground</TabsTrigger><TabsTrigger value="keys">API Keys</TabsTrigger><TabsTrigger value="webhooks">Webhooks</TabsTrigger><TabsTrigger value="analytics">Analytics</TabsTrigger></TabsList>

        <TabsContent value="playground">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Play className="h-5 w-5" />API Playground</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div><Label>Method</Label><Select value={testRequest.method} onValueChange={(v) => setTestRequest(p => ({ ...p, method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GET">GET</SelectItem><SelectItem value="POST">POST</SelectItem></SelectContent></Select></div>
                <div><Label>Endpoint</Label><Input value={testRequest.endpoint} onChange={(e) => setTestRequest(p => ({ ...p, endpoint: e.target.value }))} /></div>
                <Button onClick={handleTestRequest} disabled={loading} className="w-full">{loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : 'Send Request'}</Button>
              </div>
              <div><Label>Response</Label><pre className="bg-muted p-4 rounded-md text-sm overflow-auto h-64 mt-2"><code>{testResponse || 'Response will appear here...'}</code></pre></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />API Keys</CardTitle></CardHeader>
            <CardContent><Button onClick={generateApiKey}>Generate New Key</Button></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" />Webhooks</CardTitle></CardHeader>
            <CardContent>
              {loadingLogs ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : webhookLogs.length === 0 ? <p className="text-muted-foreground text-center py-4">No webhook logs</p> : (
                <div className="space-y-2">{webhookLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3"><Badge variant={log.success ? 'default' : 'destructive'}>{log.success ? 'success' : 'failed'}</Badge><div><p className="font-medium">{log.webhook_type}</p><p className="text-sm text-muted-foreground truncate max-w-[200px]">{log.webhook_url}</p></div></div>
                    <span className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Requests</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{apiMetrics.totalRequests}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Success Rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{apiMetrics.successRate}%</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Avg Response</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{apiMetrics.avgResponseTime}ms</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Rate Limits</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{apiMetrics.rateLimitHits}</div></CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
