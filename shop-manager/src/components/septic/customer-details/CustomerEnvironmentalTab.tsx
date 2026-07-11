import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Leaf, AlertTriangle, ShieldCheck, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import AddEnvironmentalRecordDialog from './AddEnvironmentalRecordDialog';

interface CustomerEnvironmentalTabProps {
  customerId: string;
}

const severityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  monitoring: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  escalated: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const typeIcons: Record<string, React.ReactNode> = {
  concern: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  violation: <AlertTriangle className="h-4 w-4 text-red-500" />,
  compliance_check: <ShieldCheck className="h-4 w-4 text-blue-500" />,
  remediation: <Wrench className="h-4 w-4 text-emerald-500" />,
};

export default function CustomerEnvironmentalTab({ customerId }: CustomerEnvironmentalTabProps) {
  const { shopId } = useShopId();
  const [showAdd, setShowAdd] = useState(false);

  const { data: records = [] } = useQuery({
    queryKey: ['septic-environmental-records', customerId, shopId],
    queryFn: async () => {
      if (!customerId || !shopId) return [];
      const { data, error } = await supabase
        .from('septic_environmental_records')
        .select('*')
        .eq('customer_id', customerId)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId && !!shopId,
  });

  const activeIssues = records.filter((r: any) => r.status === 'open' || r.status === 'monitoring' || r.status === 'escalated');
  const totalRemediationCost = records.reduce((sum: number, r: any) => sum + Number(r.remediation_cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Leaf className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{records.length}</p>
            <p className="text-xs text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold">{activeIssues.length}</p>
            <p className="text-xs text-muted-foreground">Active Issues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShieldCheck className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">
              {records.filter((r: any) => r.record_type === 'compliance_check').length}
            </p>
            <p className="text-xs text-muted-foreground">Compliance Checks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wrench className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">${totalRemediationCost.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Remediation Costs</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Record
        </Button>
      </div>

      {/* Records List */}
      {records.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Leaf className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No environmental records. A clean record!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record: any) => (
            <Card key={record.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{typeIcons[record.record_type] || typeIcons.concern}</div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{record.title}</span>
                      <Badge className={severityColors[record.severity] || ''} variant="secondary">
                        {record.severity}
                      </Badge>
                      <Badge className={statusColors[record.status] || ''} variant="secondary">
                        {record.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize text-xs">
                        {record.record_type?.replace('_', ' ')}
                      </Badge>
                    </div>
                    {record.description && <p className="text-sm">{record.description}</p>}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                      {record.date_identified && <span>Identified: {format(new Date(record.date_identified), 'MMM d, yyyy')}</span>}
                      {record.date_resolved && <span>Resolved: {format(new Date(record.date_resolved), 'MMM d, yyyy')}</span>}
                      {record.regulatory_body && <span>Authority: {record.regulatory_body}</span>}
                      {record.citation_number && <span>Citation: {record.citation_number}</span>}
                    </div>
                    {record.remediation_plan && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Remediation Plan</p>
                        {record.remediation_plan}
                      </div>
                    )}
                    {record.remediation_cost && (
                      <p className="text-xs text-muted-foreground">Remediation Cost: ${Number(record.remediation_cost).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddEnvironmentalRecordDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        customerId={customerId}
      />
    </div>
  );
}
