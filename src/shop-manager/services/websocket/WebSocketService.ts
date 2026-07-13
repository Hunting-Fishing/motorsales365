
import { supabase } from "@/lib/supabase";

/**
 * WebSocket service that uses Supabase's realtime functionality
 */
export class WebSocketService {
  private channels: Map<string, any> = new Map();
  private callbacks: Record<string, Function[]> = {};
  private isConnected = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Check connection
    this.isConnected = true;
    this.trigger('open', {});
    console.log('WebSocket service initialized');
  }

  public send(data: any) {
    if (!this.isConnected) {
      console.warn('Cannot send message, WebSocket is not connected');
      return;
    }
    
    console.log('WebSocket message sent:', data);
    
    if (typeof data === 'string') {
      try {
        const parsedData = JSON.parse(data);
        if (parsedData.type === 'subscribe' && parsedData.channel) {
          this.subscribe(parsedData.channel);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message', e);
      }
    }
  }

  public close() {
    this.channels.forEach((channel) => {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
    });
    
    this.channels.clear();
    this.isConnected = false;
    this.trigger('close', { code: 1000, reason: 'Normal closure' });
    console.log('WebSocket disconnected');
  }

  public on(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  private trigger(event: string, data: any) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  private subscribe(channelName: string) {
    // Use Supabase's realtime functionality
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: true
        }
      }
    });

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        this.trigger('message', { data: JSON.stringify(payload) });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.trigger('message', { 
            data: JSON.stringify({ 
              type: 'subscription_success', 
              data: { channel: channelName } 
            }) 
          });
        }
      });

    this.channels.set(channelName, channel);
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
