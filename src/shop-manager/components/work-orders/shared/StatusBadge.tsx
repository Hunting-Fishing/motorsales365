
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { jobLineStatusMap } from '@/types/jobLine';
import { partStatusMap } from '@/types/workOrderPart';

interface StatusBadgeProps {
  status: string;
  type: 'jobLine' | 'part';
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const statusMap = type === 'jobLine' ? jobLineStatusMap : partStatusMap;
  const statusInfo = statusMap[status] || { label: status, classes: 'bg-muted/20 text-muted-foreground border-muted/30' };
  
  return (
    <Badge className={`font-medium px-2 py-1 rounded-full border transition-all duration-200 hover:shadow-sm ${statusInfo.classes}`}>
      {statusInfo.label}
    </Badge>
  );
}
