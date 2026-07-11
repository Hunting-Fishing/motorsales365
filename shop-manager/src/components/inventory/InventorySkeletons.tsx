import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventoryView } from '@/contexts/InventoryViewContext';

export function InventoryTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      {/* Table skeleton */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 gap-4 p-4 border-b bg-muted/50">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-8 gap-4 p-4 border-b">
            {Array.from({ length: 8 }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InventoryGridSkeleton() {
  return (
    <div className="space-y-6">
      {/* Controls skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg border p-4 space-y-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InventoryListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-card rounded-lg border">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

export function InventoryContentSkeleton() {
  const { viewMode } = useInventoryView();
  
  switch (viewMode) {
    case 'cards':
    case 'grid':
      return <InventoryGridSkeleton />;
    case 'list':
      return <InventoryListSkeleton />;
    case 'table':
    default:
      return <InventoryTableSkeleton />;
  }
}