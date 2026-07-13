
import React from 'react';
import { type ServiceSelectionSummary } from '@/types/selectedService';
import { Clock, DollarSign, Package } from 'lucide-react';

interface ServiceSelectionSummaryProps {
  summary: ServiceSelectionSummary;
}

export function ServiceSelectionSummary({ summary }: ServiceSelectionSummaryProps) {
  if (summary.totalServices === 0) {
    return null;
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <h4 className="text-sm font-medium text-slate-700 mb-2">Selection Summary</h4>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Package className="h-4 w-4 text-slate-500" />
          <span className="text-slate-600">{summary.totalServices} services</span>
        </div>
        {summary.totalEstimatedTime > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-slate-600">{summary.totalEstimatedTime}min</span>
          </div>
        )}
        {summary.totalEstimatedCost > 0 && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-slate-500" />
            <span className="text-slate-600">${summary.totalEstimatedCost}</span>
          </div>
        )}
      </div>
    </div>
  );
}
