
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'work-order' | 'inventory' | 'customer' | 'team' | 'chat' | 'invoice';
  timestamp: string;
  read: boolean;
  duration?: number;
  actionUrl?: string;
  link?: string;
  priority?: 'low' | 'medium' | 'high';
  sender?: string;
  recipient?: string;
}

export interface NotificationSubscription {
  category: string;
  enabled: boolean;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  email: boolean;
  push: boolean;
  inApp: boolean;
  categories: {
    system: boolean;
    'work-order': boolean;
    inventory: boolean;
    customer: boolean;
    team: boolean;
    chat: boolean;
    invoice: boolean;
  };
  subscriptions: NotificationSubscription[];
  frequency: 'immediate' | 'hourly' | 'daily';
  frequencies: {
    [key: string]: 'realtime' | 'hourly' | 'daily' | 'weekly';
  };
  sound: string;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}
