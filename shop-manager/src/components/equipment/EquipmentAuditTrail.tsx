import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { History } from 'lucide-react';

interface EquipmentAuditTrailProps {
  entityType: string;
  entityId: string;
}

export function EquipmentAuditTrail({ entityType, entityId }: EquipmentAuditTrailProps) {
  const { shopId } = useShopId();

  const { data: auditRecords, isLoading } = useQuery({
    queryKey: ['equipment-audit-trail', shopId, entityType, entityId],
    queryFn: async () => {
      if (!shopId) return [];

      const { data, error } = await supabase
        .from('equipment_audit_trail')
        .select('*')
        .eq('shop_id', shopId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!shopId && !!entityId,
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading history...</div>;
  }

  if (!auditRecords || auditRecords.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>No history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {auditRecords.map((record) => (
        <Card key={record.id}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={record.action === 'INSERT' ? 'default' : 'secondary'}>
                    {record.action}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(record.changed_at), 'PPpp')}
                  </span>
                </div>
                <p className="text-sm font-medium mb-1">
                  Changed by: {record.changed_by_name}
                </p>
                {record.change_summary && (
                  <p className="text-sm text-muted-foreground">{record.change_summary}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
