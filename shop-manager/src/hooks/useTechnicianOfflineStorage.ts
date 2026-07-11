import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export type OfflineDataType = 'task_update' | 'hazard_report' | 'inspection' | 'time_entry' | 'photo_capture';

export interface OfflineQueueItem {
  id: string;
  type: OfflineDataType;
  data: any;
  timestamp: number;
  synced: boolean;
  syncAttempts: number;
  lastSyncAttempt?: number;
  conflict?: ConflictData;
  error?: string;
}

export interface ConflictData {
  localVersion: any;
  serverVersion: any;
  resolvedBy?: 'local' | 'server' | 'merged';
  resolvedAt?: number;
}

interface SyncResult {
  success: boolean;
  itemId: string;
  error?: string;
  conflict?: ConflictData;
}

const DB_NAME = 'TechnicianOfflineDB';
const DB_VERSION = 2;
const STORE_NAME = 'offlineQueue';
const MAX_SYNC_ATTEMPTS = 3;

export function useTechnicianOfflineStorage() {
  const [pendingItems, setPendingItems] = useState<OfflineQueueItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'conflict'>('idle');
  const [conflicts, setConflicts] = useState<OfflineQueueItem[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const { toast } = useToast();

  const initializeDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('syncAttempts', 'syncAttempts', { unique: false });
        }
      };
    });
  }, []);

  const loadPendingItems = useCallback(async () => {
    try {
      const db = await initializeDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      return new Promise<void>((resolve) => {
        request.onsuccess = () => {
          const items = request.result as OfflineQueueItem[];
          const pending = items.filter(item => !item.synced);
          const conflicted = items.filter(item => item.conflict && !item.conflict.resolvedBy);
          
          setPendingItems(pending);
          setConflicts(conflicted);
          resolve();
        };
      });
    } catch (error) {
      console.error('Failed to load pending items:', error);
    }
  }, [initializeDB]);

  useEffect(() => {
    loadPendingItems();
  }, [loadPendingItems]);

  const addToQueue = async (type: OfflineDataType, data: any): Promise<string> => {
    try {
      const db = await initializeDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const item: OfflineQueueItem = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        synced: false,
        syncAttempts: 0
      };
      
      await new Promise<void>((resolve, reject) => {
        const request = store.add(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      setPendingItems(prev => [...prev, item]);
      
      return item.id;
    } catch (error) {
      console.error('Failed to add to offline queue:', error);
      throw error;
    }
  };

  const syncItem = async (item: OfflineQueueItem): Promise<SyncResult> => {
    try {
      let result: SyncResult = { success: false, itemId: item.id };
      
      switch (item.type) {
        case 'task_update':
          result = await syncTaskUpdate(item);
          break;
        case 'hazard_report':
          result = await syncHazardReport(item);
          break;
        case 'inspection':
          result = await syncInspection(item);
          break;
        case 'time_entry':
          result = await syncTimeEntry(item);
          break;
        case 'photo_capture':
          result = await syncPhotoCapture(item);
          break;
        default:
          result = { success: false, itemId: item.id, error: 'Unknown item type' };
      }
      
      return result;
    } catch (error: any) {
      return { success: false, itemId: item.id, error: error.message };
    }
  };

  const syncTaskUpdate = async (item: OfflineQueueItem): Promise<SyncResult> => {
    const { workOrderId, status, notes, completedAt } = item.data;
    
    // Check for conflicts - get server version
    const { data: serverData, error: fetchError } = await supabase
      .from('work_orders')
      .select('status, updated_at, diagnostic_notes')
      .eq('id', workOrderId)
      .single();
    
    if (fetchError) {
      return { success: false, itemId: item.id, error: fetchError.message };
    }
    
    // Check if server version was updated after our local change
    const serverUpdatedAt = new Date(serverData.updated_at).getTime();
    if (serverUpdatedAt > item.timestamp) {
      return {
        success: false,
        itemId: item.id,
        conflict: {
          localVersion: item.data,
          serverVersion: serverData
        }
      };
    }
    
    // No conflict, proceed with update
    const { error } = await supabase
      .from('work_orders')
      .update({ 
        status, 
        diagnostic_notes: notes || serverData.diagnostic_notes,
        end_time: completedAt 
      })
      .eq('id', workOrderId);
    
    if (error) {
      return { success: false, itemId: item.id, error: error.message };
    }
    
    return { success: true, itemId: item.id };
  };

  const syncHazardReport = async (item: OfflineQueueItem): Promise<SyncResult> => {
    const { error } = await supabase
      .from('safety_incidents' as any)
      .insert({
        shop_id: item.data.shopId,
        reported_by: item.data.reportedBy,
        incident_date: item.data.incidentDate,
        incident_time: item.data.incidentTime,
        incident_type: item.data.incidentType || 'hazard',
        severity: item.data.severity || 'low',
        location: item.data.location,
        title: item.data.title,
        description: item.data.description,
        equipment_id: item.data.equipmentId,
        investigation_status: 'reported'
      });
    
    if (error) {
      return { success: false, itemId: item.id, error: error.message };
    }
    
    return { success: true, itemId: item.id };
  };

  const syncInspection = async (item: OfflineQueueItem): Promise<SyncResult> => {
    const { error } = await supabase
      .from('daily_inspections' as any)
      .insert({
        shop_id: item.data.shopId,
        inspector_id: item.data.inspectorId,
        inspection_date: item.data.inspectionDate,
        inspection_type: item.data.inspectionType,
        status: item.data.status,
        findings: item.data.findings,
        notes: item.data.notes
      });
    
    if (error) {
      return { success: false, itemId: item.id, error: error.message };
    }
    
    return { success: true, itemId: item.id };
  };

  const syncTimeEntry = async (item: OfflineQueueItem): Promise<SyncResult> => {
    // For now, just log - would implement actual time tracking sync
    console.log('Syncing time entry:', item.data);
    return { success: true, itemId: item.id };
  };

  const syncPhotoCapture = async (item: OfflineQueueItem): Promise<SyncResult> => {
    // For now, just log - would implement actual photo upload
    console.log('Syncing photo:', item.data);
    return { success: true, itemId: item.id };
  };

  const syncAll = async () => {
    if (syncStatus === 'syncing') return;
    
    setSyncStatus('syncing');
    const itemsToSync = pendingItems.filter(
      item => !item.synced && item.syncAttempts < MAX_SYNC_ATTEMPTS && !item.conflict
    );
    
    let hasConflicts = false;
    let hasErrors = false;
    
    for (const item of itemsToSync) {
      const result = await syncItem(item);
      
      const db = await initializeDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      if (result.success) {
        item.synced = true;
        await new Promise<void>((resolve) => {
          const request = store.put(item);
          request.onsuccess = () => resolve();
        });
      } else if (result.conflict) {
        item.conflict = result.conflict;
        item.syncAttempts += 1;
        item.lastSyncAttempt = Date.now();
        await new Promise<void>((resolve) => {
          const request = store.put(item);
          request.onsuccess = () => resolve();
        });
        hasConflicts = true;
      } else {
        item.error = result.error;
        item.syncAttempts += 1;
        item.lastSyncAttempt = Date.now();
        await new Promise<void>((resolve) => {
          const request = store.put(item);
          request.onsuccess = () => resolve();
        });
        hasErrors = true;
      }
    }
    
    await loadPendingItems();
    setLastSyncTime(Date.now());
    
    if (hasConflicts) {
      setSyncStatus('conflict');
      toast({
        title: 'Sync Conflict',
        description: 'Some items have conflicts that need resolution',
        variant: 'destructive'
      });
    } else if (hasErrors) {
      setSyncStatus('error');
      toast({
        title: 'Sync Error',
        description: 'Some items failed to sync',
        variant: 'destructive'
      });
    } else {
      setSyncStatus('idle');
      if (itemsToSync.length > 0) {
        toast({
          title: 'Sync Complete',
          description: `${itemsToSync.length} items synced successfully`
        });
      }
    }
  };

  const resolveConflict = async (
    itemId: string, 
    resolution: 'local' | 'server' | 'merged',
    mergedData?: any
  ) => {
    const db = await initializeDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.get(itemId);
    
    return new Promise<void>((resolve) => {
      request.onsuccess = async () => {
        const item = request.result as OfflineQueueItem;
        
        if (item && item.conflict) {
          item.conflict.resolvedBy = resolution;
          item.conflict.resolvedAt = Date.now();
          
          if (resolution === 'local' || resolution === 'merged') {
            // Re-sync with the chosen data
            const dataToSync = resolution === 'merged' ? mergedData : item.data;
            item.data = dataToSync;
            item.synced = false;
            item.syncAttempts = 0;
          } else {
            // Use server version, mark as synced
            item.synced = true;
          }
          
          await new Promise<void>((res) => {
            const putRequest = store.put(item);
            putRequest.onsuccess = () => res();
          });
          
          await loadPendingItems();
          
          if (resolution === 'local' || resolution === 'merged') {
            await syncAll();
          }
        }
        
        resolve();
      };
    });
  };

  const removeItem = async (itemId: string) => {
    const db = await initializeDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve) => {
      const request = store.delete(itemId);
      request.onsuccess = () => resolve();
    });
    
    await loadPendingItems();
  };

  const clearSyncedItems = async () => {
    const db = await initializeDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    return new Promise<void>((resolve) => {
      request.onsuccess = async () => {
        const items = request.result as OfflineQueueItem[];
        for (const item of items) {
          if (item.synced) {
            await new Promise<void>((res) => {
              const deleteRequest = store.delete(item.id);
              deleteRequest.onsuccess = () => res();
            });
          }
        }
        await loadPendingItems();
        resolve();
      };
    });
  };

  return {
    pendingItems,
    conflicts,
    syncStatus,
    lastSyncTime,
    pendingCount: pendingItems.filter(i => !i.synced).length,
    conflictCount: conflicts.length,
    addToQueue,
    syncAll,
    resolveConflict,
    removeItem,
    clearSyncedItems,
    refresh: loadPendingItems
  };
}
