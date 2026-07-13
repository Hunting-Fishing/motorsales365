
import { useState, useEffect, useCallback, useRef } from 'react';
import { PhaseProgressItem } from '@/types/dashboard';
import { getPhaseProgress, getRecentWorkOrders } from '@/services/dashboard/workOrderService';
import { getStats } from '@/services/dashboard/statsService';
import { supabase } from '@/lib/supabase';

interface DashboardCache {
  data: any;
  timestamp: number;
  expiry: number;
}

export function useDashboardData() {
  const [phaseProgressData, setPhaseProgressData] = useState<PhaseProgressItem[]>([]);
  const [recentWorkOrders, setRecentWorkOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Cache for dashboard data (5 minutes expiry)
  const cacheRef = useRef<Map<string, DashboardCache>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Realtime subscriptions ref
  const subscriptionsRef = useRef<any[]>([]);

  const getFromCache = useCallback((key: string) => {
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() < cached.expiry) {
      console.log(`Using cached data for ${key}`);
      return cached.data;
    }
    return null;
  }, []);

  const setCache = useCallback((key: string, data: any) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + CACHE_DURATION
    });
  }, []);

  const fetchAllData = useCallback(async (useCache = true) => {
    try {
      setIsLoading(true);
      console.log("Fetching dashboard data with performance optimizations...");
      
      // Check cache first
      const cachedStats = useCache ? getFromCache('stats') : null;
      const cachedPhase = useCache ? getFromCache('phase') : null;
      const cachedRecent = useCache ? getFromCache('recent') : null;

      // Prepare promises for non-cached data
      const promises: Promise<any>[] = [];
      const promiseKeys: string[] = [];

      if (!cachedStats) {
        promises.push(getStats());
        promiseKeys.push('stats');
      }
      if (!cachedPhase) {
        promises.push(getPhaseProgress());
        promiseKeys.push('phase');
      }
      if (!cachedRecent) {
        promises.push(getRecentWorkOrders());
        promiseKeys.push('recent');
      }

      // Fetch only non-cached data in parallel
      const results = promises.length > 0 ? await Promise.all(promises) : [];
      
      // Update state with cached and fresh data
      let statsData = cachedStats;
      let phaseData = cachedPhase;
      let recentData = cachedRecent;

      results.forEach((result, index) => {
        const key = promiseKeys[index];
        setCache(key, result);
        
        if (key === 'stats') statsData = result;
        if (key === 'phase') phaseData = result;
        if (key === 'recent') recentData = result;
      });

      setStats(statsData || cachedStats);
      setPhaseProgressData(phaseData || cachedPhase || []);
      setRecentWorkOrders(recentData || cachedRecent || []);
      setError(null);
      setLastUpdated(new Date());
      
      console.log("Dashboard data loaded with performance optimizations");
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      
      // Try to use cached data as fallback
      const fallbackStats = getFromCache('stats');
      const fallbackPhase = getFromCache('phase');
      const fallbackRecent = getFromCache('recent');
      
      if (fallbackStats || fallbackPhase || fallbackRecent) {
        setStats(fallbackStats);
        setPhaseProgressData(fallbackPhase || []);
        setRecentWorkOrders(fallbackRecent || []);
        console.log("Using cached data as fallback");
      }
    } finally {
      setIsLoading(false);
    }
  }, [getFromCache, setCache]);

  const refreshData = useCallback(() => {
    console.log("Force refreshing dashboard data...");
    fetchAllData(false); // Force refresh without cache
  }, [fetchAllData]);

  useEffect(() => {
    fetchAllData();
    
    // Set up real-time subscriptions
    console.log("Setting up real-time dashboard subscriptions...");
    
    // Subscribe to work orders changes
    const workOrdersSubscription = supabase
      .channel('dashboard-work-orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'work_orders' },
        (payload) => {
          console.log('Work orders changed:', payload);
          // Invalidate cache and refresh
          cacheRef.current.delete('stats');
          cacheRef.current.delete('phase');
          cacheRef.current.delete('recent');
          fetchAllData(false);
        }
      )
      .subscribe();

    // Subscribe to inventory changes
    const inventorySubscription = supabase
      .channel('dashboard-inventory')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        (payload) => {
          console.log('Inventory changed:', payload);
          cacheRef.current.delete('stats');
          fetchAllData(false);
        }
      )
      .subscribe();

    // Subscribe to profiles changes
    const profilesSubscription = supabase
      .channel('dashboard-profiles')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Profiles changed:', payload);
          cacheRef.current.delete('stats');
          fetchAllData(false);
        }
      )
      .subscribe();

    subscriptionsRef.current = [workOrdersSubscription, inventorySubscription, profilesSubscription];

    // Auto-refresh every 10 minutes as fallback
    const autoRefreshInterval = setInterval(() => {
      console.log("Auto-refreshing dashboard data...");
      fetchAllData(false);
    }, 10 * 60 * 1000);

    return () => {
      console.log("Cleaning up dashboard subscriptions...");
      subscriptionsRef.current.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
      clearInterval(autoRefreshInterval);
    };
  }, [fetchAllData]);

  return {
    phaseProgressData,
    recentWorkOrders,
    stats,
    isLoading,
    error,
    lastUpdated,
    refreshData
  };
}
