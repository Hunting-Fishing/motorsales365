import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'grid';
  count?: number;
}

const ProductCardSkeleton: React.FC = () => (
  <Card className="overflow-hidden">
    <div className="aspect-square relative">
      <Skeleton className="h-full w-full" />
    </div>
    <CardContent className="p-4 space-y-3">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-24" />
    </CardContent>
    <CardFooter className="p-4 pt-0 flex gap-2">
      <Skeleton className="h-9 flex-1" />
      <Skeleton className="h-9 w-9" />
    </CardFooter>
  </Card>
);

const ProductListSkeleton: React.FC = () => (
  <Card className="overflow-hidden">
    <div className="flex">
      <div className="w-32 h-32 shrink-0">
        <Skeleton className="h-full w-full" />
      </div>
      <CardContent className="flex-1 p-4 space-y-2">
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardContent>
    </div>
  </Card>
);

const GridSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: count }, (_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

const ListSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div className="space-y-4">
    {Array.from({ length: count }, (_, i) => (
      <ProductListSkeleton key={i} />
    ))}
  </div>
);

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  variant = 'grid', 
  count = 8 
}) => {
  switch (variant) {
    case 'card':
      return <ProductCardSkeleton />;
    case 'list':
      return <ListSkeleton count={count} />;
    case 'grid':
    default:
      return <GridSkeleton count={count} />;
  }
};

export default LoadingSkeleton;