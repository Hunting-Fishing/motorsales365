import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface MemoryOptimizationOptions {
  maxCacheSize?: number; // Maximum number of cached queries
  gcInterval?: number; // Garbage collection interval in ms
  enablePerformanceMonitoring?: boolean;
}

export function useMemoryOptimization({
  maxCacheSize = 100,
  gcInterval = 5 * 60 * 1000, // 5 minutes
  enablePerformanceMonitoring = true
}: MemoryOptimizationOptions = {}) {
  const queryClient = useQueryClient();
  const gcIntervalRef = useRef<NodeJS.Timeout>();
  const memoryUsageRef = useRef<number>(0);

  // Monitor memory usage
  const measureMemoryUsage = useCallback(() => {
    if (!enablePerformanceMonitoring || !('memory' in performance)) {
      return 0;
    }
    
    try {
      const memInfo = (performance as any).memory;
      return memInfo.usedJSHeapSize / 1024 / 1024; // Convert to MB
    } catch {
      return 0;
    }
  }, [enablePerformanceMonitoring]);

  // Cleanup stale and unused queries
  const performGarbageCollection = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    console.log('🧹 Memory Optimization: Starting garbage collection');
    console.log('📊 Current queries in cache:', queries.length);
    
    // Sort queries by last accessed time
    const sortedQueries = queries.sort((a, b) => {
      const aTime = a.state.dataUpdatedAt || 0;
      const bTime = b.state.dataUpdatedAt || 0;
      return aTime - bTime;
    });
    
    // Remove oldest queries if we exceed max cache size
    if (sortedQueries.length > maxCacheSize) {
      const queriesToRemove = sortedQueries.slice(0, sortedQueries.length - maxCacheSize);
      
      queriesToRemove.forEach(query => {
        // Don't remove queries that are currently fetching or have observers
        if (query.state.fetchStatus !== 'fetching' && query.getObserversCount() === 0) {
          cache.remove(query);
          console.log('🗑️ Removed query from cache:', query.queryHash);
        }
      });
    }
    
    // Force garbage collection of unused data
    const queriesToClear = queries.filter(query => {
      // Keep queries that:
      // - Are currently being observed
      // - Were updated recently (within 10 minutes)
      // - Are currently fetching
      const isObserved = query.getObserversCount() > 0;
      const isRecent = (Date.now() - (query.state.dataUpdatedAt || 0)) < 10 * 60 * 1000;
      const isFetching = query.state.fetchStatus === 'fetching';
      
      return !isObserved && !isRecent && !isFetching;
    });
    
    queriesToClear.forEach(query => cache.remove(query));
    
    const memoryAfter = measureMemoryUsage();
    memoryUsageRef.current = memoryAfter;
    
    console.log('✅ Memory Optimization: Garbage collection complete');
    console.log('📊 Memory usage:', memoryAfter.toFixed(2), 'MB');
    console.log('📊 Remaining queries:', cache.getAll().length);
  }, [queryClient, maxCacheSize, measureMemoryUsage]);

  // Cleanup large objects from memory
  const clearLargeQueries = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    queries.forEach(query => {
      const data = query.state.data;
      if (data && Array.isArray(data) && data.length > 1000) {
        // Clear very large datasets if they haven't been accessed recently
        const lastAccessed = query.state.dataUpdatedAt || 0;
        const timeSinceAccess = Date.now() - lastAccessed;
        
        if (timeSinceAccess > 15 * 60 * 1000 && query.getObserversCount() === 0) { // 15 minutes
          cache.remove(query);
          console.log('🧹 Cleared large query:', query.queryHash, 'Size:', data.length);
        }
      }
    });
  }, [queryClient]);

  // Prefetch cleanup
  const cleanupPrefetchedQueries = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Remove prefetched queries that were never used
    const prefetchedQueries = queries.filter(query => {
      const wasPrefetched = query.state.fetchStatus === 'idle' && 
                          query.getObserversCount() === 0 &&
                          (Date.now() - (query.state.dataUpdatedAt || 0)) > 2 * 60 * 1000; // 2 minutes
      
      return wasPrefetched;
    });
    
    prefetchedQueries.forEach(query => cache.remove(query));
  }, [queryClient]);

  // Setup garbage collection interval
  useEffect(() => {
    if (gcInterval > 0) {
      gcIntervalRef.current = setInterval(() => {
        performGarbageCollection();
        clearLargeQueries();
        cleanupPrefetchedQueries();
      }, gcInterval);
      
      return () => {
        if (gcIntervalRef.current) {
          clearInterval(gcIntervalRef.current);
        }
      };
    }
  }, [gcInterval, performGarbageCollection, clearLargeQueries, cleanupPrefetchedQueries]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      performGarbageCollection();
    };
  }, [performGarbageCollection]);

  // Performance monitoring
  const getMemoryStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    const currentMemory = measureMemoryUsage();
    
    return {
      queryCacheSize: queries.length,
      memoryUsage: currentMemory,
      staleCacheCount: queries.filter(q => q.isStale()).length,
      activeCacheCount: queries.filter(q => q.getObserversCount() > 0).length
    };
  }, [queryClient, measureMemoryUsage]);

  return {
    performGarbageCollection,
    clearLargeQueries,
    cleanupPrefetchedQueries,
    getMemoryStats,
    currentMemoryUsage: memoryUsageRef.current
  };
}
