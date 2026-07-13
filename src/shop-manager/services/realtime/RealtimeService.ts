import { supabase } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type DatabaseChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';
export type RealtimeEventCallback<T = any> = (payload: RealtimePostgresChangesPayload<T>) => void;

interface ChannelSubscription {
  channel: RealtimeChannel;
  subscriptions: Map<string, RealtimeEventCallback>;
}

class RealtimeService {
  private channels: Map<string, ChannelSubscription> = new Map();
  private isConnected = false;

  /**
   * Subscribe to real-time changes for a specific table
   */
  subscribeToTable<T = any>(
    table: string,
    callback: RealtimeEventCallback<T>,
    options?: {
      event?: DatabaseChangeEvent;
      filter?: string;
      schema?: string;
    }
  ): () => void {
    const {
      event = 'INSERT',
      filter,
      schema = 'public'
    } = options || {};

    const channelId = `${schema}:${table}`;
    const subscriptionId = `${event}:${filter || 'all'}`;

    // Get or create channel
    let channelSub = this.channels.get(channelId);
    if (!channelSub) {
      const channel = supabase
        .channel(`schema-db-changes:${channelId}`);

      // Configure the channel with postgres changes
      channel.on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          ...(filter && { filter })
        },
        callback
      );

      channelSub = {
        channel,
        subscriptions: new Map()
      };
      this.channels.set(channelId, channelSub);
    }

    // Add subscription
    channelSub.subscriptions.set(subscriptionId, callback);

    // Subscribe if not already subscribed
    if (channelSub.subscriptions.size === 1) {
      channelSub.channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          console.log(`✅ Subscribed to ${table} changes`);
        }
      });
    }

    // Return unsubscribe function
    return () => this.unsubscribe(channelId, subscriptionId);
  }

  /**
   * Subscribe to multiple events for a table
   */
  subscribeToTableEvents<T = any>(
    table: string,
    events: {
      onInsert?: RealtimeEventCallback<T>;
      onUpdate?: RealtimeEventCallback<T>;
      onDelete?: RealtimeEventCallback<T>;
    },
    options?: {
      filter?: string;
      schema?: string;
    }
  ): () => void {
    const unsubscribeFunctions: (() => void)[] = [];

    if (events.onInsert) {
      unsubscribeFunctions.push(
        this.subscribeToTable(table, events.onInsert, { ...options, event: 'INSERT' })
      );
    }

    if (events.onUpdate) {
      unsubscribeFunctions.push(
        this.subscribeToTable(table, events.onUpdate, { ...options, event: 'UPDATE' })
      );
    }

    if (events.onDelete) {
      unsubscribeFunctions.push(
        this.subscribeToTable(table, events.onDelete, { ...options, event: 'DELETE' })
      );
    }

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }

  /**
   * Subscribe to presence updates for a room
   */
  subscribeToPresence(
    roomId: string,
    callbacks: {
      onJoin?: (key: string, newPresences: any) => void;
      onLeave?: (key: string, leftPresences: any) => void;
      onSync?: () => void;
    }
  ): RealtimeChannel {
    const channel = supabase.channel(`presence:${roomId}`);

    if (callbacks.onSync) {
      channel.on('presence', { event: 'sync' }, callbacks.onSync);
    }

    if (callbacks.onJoin) {
      channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        callbacks.onJoin!(key, newPresences);
      });
    }

    if (callbacks.onLeave) {
      channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        callbacks.onLeave!(key, leftPresences);
      });
    }

    channel.subscribe();
    return channel;
  }

  /**
   * Track user presence in a room
   */
  async trackPresence(roomId: string, userState: any): Promise<RealtimeChannel> {
    const channel = supabase.channel(`presence:${roomId}`);
    
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(userState);
      }
    });

    return channel;
  }

  /**
   * Unsubscribe from a specific subscription
   */
  private unsubscribe(channelId: string, subscriptionId: string): void {
    const channelSub = this.channels.get(channelId);
    if (!channelSub) return;

    channelSub.subscriptions.delete(subscriptionId);

    // If no more subscriptions, remove channel
    if (channelSub.subscriptions.size === 0) {
      supabase.removeChannel(channelSub.channel);
      this.channels.delete(channelId);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach(({ channel }) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.isConnected = false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get active channels count
   */
  getActiveChannelsCount(): number {
    return this.channels.size;
  }
}

export const realtimeService = new RealtimeService();