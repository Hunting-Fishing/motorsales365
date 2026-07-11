
import { Notification, NotificationPreferences } from '@/types/notification';

export const defaultNotifications: Notification[] = [
  {
    id: '1',
    title: 'Welcome to All Business 365',
    message: 'Your account has been set up successfully. Start managing your shop today!',
    type: 'success',
    category: 'system',
    timestamp: new Date().toISOString(),
    read: false,
    priority: 'medium'
  }
];

export const defaultPreferences: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  email: true,
  push: true,
  inApp: true,
  categories: {
    system: true,
    'work-order': true,
    inventory: true,
    customer: true,
    team: true,
    chat: true,
    invoice: true
  },
  subscriptions: [
    { category: 'system', enabled: true },
    { category: 'work-order', enabled: true },
    { category: 'inventory', enabled: true },
    { category: 'customer', enabled: true },
    { category: 'team', enabled: true },
    { category: 'chat', enabled: true },
    { category: 'invoice', enabled: true }
  ],
  frequency: 'immediate',
  frequencies: {
    'system': 'realtime',
    'work-order': 'realtime',
    'inventory': 'realtime',
    'customer': 'realtime',
    'team': 'realtime',
    'chat': 'realtime',
    'invoice': 'realtime'
  },
  sound: 'default',
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};
