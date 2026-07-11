import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_by: string;
  changed_by_name: string | null;
  created_at: string;
}

const ENTITY_TYPES = [
  { value: 'time_card', label: 'Time Card' },
  { value: 'pay_period', label: 'Pay Period' },
  { value: 'payroll_run', label: 'Payroll Run' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'addition', label: 'Addition' },
  { value: 'dispute', label: 'Dispute' },
  { value: 'leave_request', label: 'Leave Request' },
];

const ACTION_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  create: { label: 'Created', variant: 'default' },
  update: { label: 'Updated', variant: 'secondary' },
  delete: { label: 'Deleted', variant: 'destructive' },
  approve: { label: 'Approved', variant: 'default' },
  reject: { label: 'Rejected', variant: 'destructive' },
  process: { label: 'Processed', variant: 'default' },
  approved: { label: 'Approved', variant: 'default' },
  denied: { label: 'Denied', variant: 'destructive' },
  under_review: { label: 'Under Review', variant: 'outline' },
};

export function PayrollAuditTrail() {
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const { shopId } = useShopId();

  useEffect(() => {
    if (shopId) {
      fetchAuditLogs();
    }
  }, [shopId]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('payroll_audit_log' as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(500) as any);

      if (error) throw error;

      // Fetch user names for changed_by
      const userIds = [...new Set((data as any[])?.map(d => d.changed_by) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [
        p.id,
        p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.email || 'Unknown'
      ]));

      setAuditLogs((data || []).map((log: any) => ({
        ...log,
        old_values: typeof log.old_values === 'object' ? log.old_values : null,
        new_values: typeof log.new_values === 'object' ? log.new_values : null,
        changed_by_name: profileMap.get(log.changed_by) || log.changed_by_name || 'Unknown',
      })));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (filterEntityType !== 'all' && log.entity_type !== filterEntityType) return false;
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        log.changed_by_name?.toLowerCase().includes(search) ||
        log.entity_type.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search) ||
        JSON.stringify(log.new_values || {}).toLowerCase().includes(search)
      );
    }
    return true;
  });

  const formatChanges = (oldValues: Record<string, any> | null, newValues: Record<string, any> | null) => {
    if (!oldValues && !newValues) return 'No details';
    
    const changes: string[] = [];
    
    if (newValues) {
      Object.entries(newValues).forEach(([key, value]) => {
        const oldVal = oldValues?.[key];
        if (oldVal !== value) {
          if (oldVal !== undefined) {
            changes.push(`${key}: ${oldVal} → ${value}`);
          } else {
            changes.push(`${key}: ${value}`);
          }
        }
      });
    }
    
    return changes.length > 0 ? changes.join(', ') : 'No changes recorded';
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading audit trail...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Payroll Audit Trail
        </CardTitle>
        <CardDescription>Track all changes made to payroll data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterEntityType} onValueChange={setFilterEntityType}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ENTITY_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Created</SelectItem>
              <SelectItem value="update">Updated</SelectItem>
              <SelectItem value="delete">Deleted</SelectItem>
              <SelectItem value="approve">Approved</SelectItem>
              <SelectItem value="reject">Rejected</SelectItem>
              <SelectItem value="process">Processed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                  </TableCell>
                  <TableCell className="font-medium">{log.changed_by_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ENTITY_TYPES.find(t => t.value === log.entity_type)?.label || log.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ACTION_BADGES[log.action]?.variant || 'secondary'}>
                      {ACTION_BADGES[log.action]?.label || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-sm text-muted-foreground" 
                    title={formatChanges(log.old_values, log.new_values)}>
                    {formatChanges(log.old_values, log.new_values)}
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No audit logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <p className="text-sm text-muted-foreground mt-4">
          Showing {filteredLogs.length} of {auditLogs.length} entries
        </p>
      </CardContent>
    </Card>
  );
}
