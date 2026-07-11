import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Clock, Database, Activity } from 'lucide-react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

export function PerformanceMonitor() {
  const { metrics, isVisible } = usePerformanceMonitor();

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 bg-slate-900 text-white border-slate-700 shadow-xl z-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Monitor className="w-4 h-4" />
          Performance Monitor
          <span className="text-xs text-slate-400 ml-auto">Ctrl+Shift+P</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-blue-400" />
            <span className="text-xs">Load Time</span>
          </div>
          <span className="text-xs font-mono text-blue-300">
            {metrics.loadTime}ms
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3 text-emerald-400" />
            <span className="text-xs">Cache Hit Rate</span>
          </div>
          <span className="text-xs font-mono text-emerald-300">
            {(metrics.cacheHitRatio * 100).toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-orange-400" />
            <span className="text-xs">Requests</span>
          </div>
          <span className="text-xs font-mono text-orange-300">
            {metrics.totalRequests}
            {metrics.failedRequests > 0 && (
              <span className="text-red-400 ml-1">({metrics.failedRequests} failed)</span>
            )}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-400" />
            <span className="text-xs">Data Freshness</span>
          </div>
          <span className="text-xs font-mono text-purple-300">
            {metrics.dataFreshness > 0 ? `${Math.round(metrics.dataFreshness / 1000)}s` : 'Fresh'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}