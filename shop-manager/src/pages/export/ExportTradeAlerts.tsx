import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExportTradeAlerts } from '@/hooks/export/useExportTradeAlerts';
import { Loader2, Bell, AlertTriangle, Info, AlertCircle, CheckCircle, X, Trash2 } from 'lucide-react';

const severityConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  critical: { icon: <AlertCircle className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-500/10' },
  high: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  medium: { icon: <Info className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  low: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
};

const categoryLabels: Record<string, string> = {
  payment: 'Payment', certificate: 'Certificate', shipment: 'Shipment', credit: 'Credit',
  compliance: 'Compliance', inventory: 'Inventory', general: 'General',
};

export default function ExportTradeAlerts() {
  const { alerts, loading, unreadCount, markRead, dismiss, dismissAll } = useExportTradeAlerts();

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Trade Alerts</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">{unreadCount} new</Badge>
          )}
        </div>
        {alerts.length > 0 && (
          <Button variant="outline" size="sm" onClick={dismissAll}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />Clear All
          </Button>
        )}
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : alerts.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Active Alerts</p>
          <p className="text-sm text-muted-foreground">Alerts for expiring certificates, overdue payments, shipment milestones, and credit limit breaches will appear here.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {alerts.map(a => {
            const sev = severityConfig[a.severity] || severityConfig.medium;
            return (
              <Card key={a.id} className={`hover:shadow-md transition-shadow ${!a.is_read ? 'border-l-4 border-l-primary' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${sev.bg}`}>
                      <div className={sev.color}>{sev.icon}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{a.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{a.message}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(a.triggered_at)}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dismiss(a.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{categoryLabels[a.category] || a.category}</Badge>
                        <Badge variant="secondary" className="text-xs">{a.severity}</Badge>
                        {!a.is_read && (
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => markRead(a.id)}>
                            Mark Read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
