import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench, ArrowRight, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEquipment } from '@/hooks/useEquipment';

export function EquipmentHealthWidget() {
  const navigate = useNavigate();
  const { equipment: assets, isLoading: loading } = useEquipment();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const operational = assets.filter(a => a.status === 'operational' || a.status === 'active').length;
  const needsMaintenance = assets.filter(a => a.status === 'maintenance' || a.status === 'needs_repair').length;
  const outOfService = assets.filter(a => a.status === 'out_of_service' || a.status === 'retired').length;
  const total = assets.length;

  const healthRate = total > 0 ? Math.round((operational / total) * 100) : 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Equipment Health
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/equipment')}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">Fleet Health</span>
          <span className={`text-2xl font-bold ${healthRate >= 90 ? 'text-green-600' : healthRate >= 70 ? 'text-yellow-600' : 'text-destructive'}`}>
            {healthRate}%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 rounded-lg bg-green-500/10">
            <CheckCircle2 className="h-5 w-5 text-green-600 mb-1" />
            <span className="text-lg font-bold text-green-600">{operational}</span>
            <span className="text-xs text-muted-foreground">Operational</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-yellow-500/10">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mb-1" />
            <span className="text-lg font-bold text-yellow-600">{needsMaintenance}</span>
            <span className="text-xs text-muted-foreground">Maintenance</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-destructive/10">
            <XCircle className="h-5 w-5 text-destructive mb-1" />
            <span className="text-lg font-bold text-destructive">{outOfService}</span>
            <span className="text-xs text-muted-foreground">Out of Service</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
