import { useState, useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  dataFreshness: number;
  cacheHitRatio: number;
  totalRequests: number;
  failedRequests: number;
}

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    dataFreshness: 0,
    cacheHitRatio: 0,
    totalRequests: 0,
    failedRequests: 0
  });

  const [isVisible, setIsVisible] = useState(false);
  const startTime = Date.now();

  const updateLoadTime = useCallback(() => {
    const loadTime = Date.now() - startTime;
    setMetrics(prev => ({ ...prev, loadTime }));
  }, [startTime]);

  const updateCacheMetrics = useCallback((hitRatio: number, freshness: number) => {
    setMetrics(prev => ({
      ...prev,
      cacheHitRatio: hitRatio,
      dataFreshness: freshness
    }));
  }, []);

  const incrementRequests = useCallback((failed = false) => {
    setMetrics(prev => ({
      ...prev,
      totalRequests: prev.totalRequests + 1,
      failedRequests: failed ? prev.failedRequests + 1 : prev.failedRequests
    }));
  }, []);

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    metrics,
    isVisible,
    updateLoadTime,
    updateCacheMetrics,
    incrementRequests,
    toggleVisibility: () => setIsVisible(prev => !prev)
  };
}