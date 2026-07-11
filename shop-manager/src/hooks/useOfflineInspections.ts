import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

const DB_NAME = 'inspection_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_inspections';

export interface OfflineInspection {
  id: string;
  type: 'vessel' | 'forklift' | 'dvir' | 'daily_shop';
  data: Record<string, any>;
  createdAt: string;
  synced: boolean;
  syncError?: string;
}

export function useOfflineInspections() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Initialize IndexedDB
  const getDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }, []);

  // Count pending inspections
  const countPending = useCallback(async () => {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(tx.objectStoreNames[0]);
      const index = store.index('synced');
      const request = index.count(IDBKeyRange.only(false));
      
      request.onsuccess = () => {
        setPendingCount(request.result);
      };
    } catch (error) {
      console.error('Error counting pending inspections:', error);
    }
  }, [getDB]);

  // Save inspection offline
  const saveOffline = async (type: OfflineInspection['type'], data: Record<string, any>): Promise<string> => {
    const inspection: OfflineInspection = {
      id: crypto.randomUUID(),
      type,
      data,
      createdAt: new Date().toISOString(),
      synced: false
    };

    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(tx.objectStoreNames[0]);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.add(inspection);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      await countPending();
      
      toast({
        title: 'Saved Offline',
        description: 'Inspection will sync when online'
      });

      return inspection.id;
    } catch (error: any) {
      console.error('Error saving offline:', error);
      throw error;
    }
  };

  // Get all pending inspections
  const getPending = async (): Promise<OfflineInspection[]> => {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(tx.objectStoreNames[0]);
      const index = store.index('synced');
      
      return new Promise((resolve, reject) => {
        const request = index.getAll(IDBKeyRange.only(false));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting pending inspections:', error);
      return [];
    }
  };

  // Mark inspection as synced
  const markSynced = async (id: string, error?: string) => {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(tx.objectStoreNames[0]);
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const inspection = getRequest.result;
        if (inspection) {
          inspection.synced = !error;
          inspection.syncError = error;
          store.put(inspection);
        }
      };

      await countPending();
    } catch (error) {
      console.error('Error marking synced:', error);
    }
  };

  // Delete synced inspections
  const clearSynced = async () => {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(tx.objectStoreNames[0]);
      const index = store.index('synced');
      
      const request = index.openCursor(IDBKeyRange.only(true));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('Error clearing synced:', error);
    }
  };

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Back Online',
        description: 'Syncing pending inspections...'
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'Offline Mode',
        description: 'Inspections will be saved locally',
        variant: 'destructive'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    countPending();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [countPending, toast]);

  return {
    isOnline,
    pendingCount,
    syncing,
    saveOffline,
    getPending,
    markSynced,
    clearSynced,
    setSyncing
  };
}
