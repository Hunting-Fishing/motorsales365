import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Shield, ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PolicyFinding {
  table_schema: string;
  table_name: string;
  policy_name: string;
  command: string;
  qual: string;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
}

interface AuditResult {
  timestamp: string;
  total_tables_checked: number;
  tables_without_rls: string[];
  qual_true_policies: PolicyFinding[];
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
}

interface SecurityFinding {
  id: string;
  audit_timestamp: string;
  critical_count: number;
  warning_count: number;
  info_count: number;
  findings: AuditResult;
  qual_true_count: number;
  tables_without_rls: string[];
  created_at: string;
}

export function SecurityAuditDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRunningAudit, setIsRunningAudit] = useState(false);

  // Fetch latest audit results using raw query since table is new
  const { data: latestAudit, isLoading } = useQuery({
    queryKey: ['security-audit-latest'],
    queryFn: async () => {
      // Use type assertion to bypass strict RPC typing for new functions
      const { data, error } = await (supabase.rpc as any)('get_latest_security_finding');
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching audit:', error);
        return null;
      }
      return data as SecurityFinding | null;
    }
  });

  // Fetch audit history
  const { data: auditHistory } = useQuery({
    queryKey: ['security-audit-history'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_security_audit_history');
      
      if (error) {
        console.error('Error fetching history:', error);
        return [];
      }
      return (data || []) as any[];
    }
  });

  // Run new audit
  const runAudit = async () => {
    setIsRunningAudit(true);
    try {
      const { data, error } = await supabase.functions.invoke('rls-audit');
      
      if (error) throw error;
      
      toast({
        title: 'Audit Complete',
        description: `Found ${data.summary.critical} critical and ${data.summary.warning} warning issues.`,
        variant: data.summary.critical > 0 ? 'destructive' : 'default'
      });
      
      queryClient.invalidateQueries({ queryKey: ['security-audit-latest'] });
      queryClient.invalidateQueries({ queryKey: ['security-audit-history'] });
    } catch (error: any) {
      toast({
        title: 'Audit Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsRunningAudit(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const getHealthStatus = () => {
    if (!latestAudit) return { icon: Shield, color: 'text-muted-foreground', label: 'No audit data' };
    if (latestAudit.critical_count > 0) return { icon: ShieldAlert, color: 'text-destructive', label: 'Critical issues found' };
    if (latestAudit.warning_count > 0) return { icon: AlertTriangle, color: 'text-yellow-500', label: 'Warnings found' };
    return { icon: ShieldCheck, color: 'text-green-500', label: 'All secure' };
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HealthIcon className={`h-8 w-8 ${healthStatus.color}`} />
          <div>
            <h2 className="text-2xl font-bold">RLS Security Audit</h2>
            <p className="text-muted-foreground">{healthStatus.label}</p>
          </div>
        </div>
        <Button onClick={runAudit} disabled={isRunningAudit}>
          {isRunningAudit ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
          ) : (
            <><RefreshCw className="h-4 w-4 mr-2" /> Run Audit</>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {latestAudit?.critical_count ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">
              {latestAudit?.warning_count ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">qual:true Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {latestAudit?.qual_true_count ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {latestAudit?.audit_timestamp 
                ? format(new Date(latestAudit.audit_timestamp), 'MMM d, yyyy h:mm a')
                : 'Never'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Findings List */}
      {latestAudit?.findings?.qual_true_policies && latestAudit.findings.qual_true_policies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Policy Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {latestAudit.findings.qual_true_policies.map((finding, index) => (
                  <div 
                    key={index} 
                    className="flex items-start justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(finding.severity) as any}>
                          {finding.severity}
                        </Badge>
                        <span className="font-mono text-sm font-medium">
                          {finding.table_name}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{finding.issue}</p>
                      <p className="text-xs text-muted-foreground">
                        Policy: {finding.policy_name} ({finding.command})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Tables without RLS */}
      {latestAudit?.tables_without_rls && latestAudit.tables_without_rls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Tables Without RLS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {latestAudit.tables_without_rls.map((table) => (
                <Badge key={table} variant="destructive">{table}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit History */}
      {auditHistory && auditHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Audit History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditHistory.map((audit: any) => (
                <div 
                  key={audit.id}
                  className="flex items-center justify-between p-2 rounded border bg-muted/50"
                >
                  <span className="text-sm">
                    {format(new Date(audit.audit_timestamp), 'MMM d, yyyy h:mm a')}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{audit.critical_count} critical</Badge>
                    <Badge variant="secondary">{audit.warning_count} warnings</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No audit data */}
      {!latestAudit && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Audit Data</h3>
            <p className="text-muted-foreground mb-4">Run your first security audit to check RLS policies.</p>
            <Button onClick={runAudit} disabled={isRunningAudit}>
              {isRunningAudit ? 'Running...' : 'Run First Audit'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
