import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeService, RealtimeEventCallback, DatabaseChangeEvent } from '@/services/realtime/RealtimeService';

interface UseRealtimeOptions {
  enabled?: boolean;
  invalidateQueries?: string[];
  onUpdate?: (data: any) => void;
}

/**
 * Hook to subscribe to real-time table changes
 */
export function useRealtime<T = any>(
  table: string,
  options: UseRealtimeOptions & {
    event?: DatabaseChangeEvent;
    filter?: string;
  } = {}
) {
  const queryClient = useQueryClient();
  const {
    enabled = true,
    invalidateQueries = [],
    onUpdate,
    event = 'UPDATE',
    filter
  } = options;

  const handleChange: RealtimeEventCallback<T> = useCallback((payload) => {
    console.log(`Real-time ${event} on ${table}:`, payload);
    
    // Invalidate related queries
    invalidateQueries.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    });

    // Call custom update handler
    if (onUpdate) {
      onUpdate(payload);
    }
  }, [queryClient, invalidateQueries, onUpdate, event, table]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = realtimeService.subscribeToTable(table, handleChange, {
      event,
      filter
    });

    return unsubscribe;
  }, [table, handleChange, enabled, event, filter]);
}

/**
 * Hook to subscribe to multiple events for a table
 */
export function useRealtimeTableEvents<T = any>(
  table: string,
  events: {
    onInsert?: (data: any) => void;
    onUpdate?: (data: any) => void;
    onDelete?: (data: any) => void;
  },
  options: UseRealtimeOptions = {}
) {
  const queryClient = useQueryClient();
  const { enabled = true, invalidateQueries = [] } = options;

  const invalidateRelatedQueries = useCallback(() => {
    invalidateQueries.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    });
  }, [queryClient, invalidateQueries]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = realtimeService.subscribeToTableEvents(table, {
      onInsert: events.onInsert ? (payload) => {
        invalidateRelatedQueries();
        events.onInsert!(payload);
      } : undefined,
      onUpdate: events.onUpdate ? (payload) => {
        invalidateRelatedQueries();
        events.onUpdate!(payload);
      } : undefined,
      onDelete: events.onDelete ? (payload) => {
        invalidateRelatedQueries();
        events.onDelete!(payload);
      } : undefined,
    });

    return unsubscribe;
  }, [table, events, enabled, invalidateRelatedQueries]);
}

/**
 * Hook for user presence in a room
 */
export function usePresence(roomId: string, userState?: any) {
  const handleJoin = useCallback((key: string, newPresences: any) => {
    console.log('User joined:', key, newPresences);
  }, []);

  const handleLeave = useCallback((key: string, leftPresences: any) => {
    console.log('User left:', key, leftPresences);
  }, []);

  const handleSync = useCallback(() => {
    console.log('Presence synced for room:', roomId);
  }, [roomId]);

  useEffect(() => {
    const channel = realtimeService.subscribeToPresence(roomId, {
      onJoin: handleJoin,
      onLeave: handleLeave,
      onSync: handleSync
    });

    // Track presence if userState provided
    if (userState) {
      realtimeService.trackPresence(roomId, userState);
    }

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, userState, handleJoin, handleLeave, handleSync]);
}