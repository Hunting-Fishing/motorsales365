import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useExportActivityLog } from '@/hooks/export/useExportActivityLog';
import { Loader2, History, Package, Users, Ship, FileText, DollarSign, Boxes, ClipboardList } from 'lucide-react';

const entityIcons: Record<string, React.ReactNode> = {
  order: <ClipboardList className="h-4 w-4" />,
  customer: <Users className="h-4 w-4" />,
  shipment: <Ship className="h-4 w-4" />,
  product: <Package className="h-4 w-4" />,
  invoice: <FileText className="h-4 w-4" />,
  payment: <DollarSign className="h-4 w-4" />,
  inventory: <Boxes className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  created: 'text-emerald-500',
  updated: 'text-blue-500',
  deleted: 'text-red-500',
  approved: 'text-green-500',
  shipped: 'text-indigo-500',
  completed: 'text-emerald-600',
  cancelled: 'text-slate-500',
};

export default function ExportActivityLog() {
  const { logs, loading } = useExportActivityLog();

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString();
  };

  // Group logs by date
  const grouped = logs.reduce((acc: Record<string, any[]>, log) => {
    const date = new Date(log.created_at).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-6 w-6 text-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : logs.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Activity Yet</p>
          <p className="text-sm text-muted-foreground">Module actions will appear here as they happen.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateLogs]) => (
            <div key={date}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{date}</h2>
              <div className="space-y-1">
                {(dateLogs as any[]).map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="p-1.5 rounded-lg bg-muted mt-0.5">
                      {entityIcons[log.entity_type] || <History className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className={`font-medium ${actionColors[log.action] || 'text-foreground'}`}>
                          {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                        </span>
                        {' '}
                        <span className="text-muted-foreground">{log.entity_type}</span>
                        {log.entity_label && <span className="font-medium text-foreground"> "{log.entity_label}"</span>}
                      </p>
                      {log.details && typeof log.details === 'object' && !Array.isArray(log.details) && Object.keys(log.details as Record<string, unknown>).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {Object.entries(log.details as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(log.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
