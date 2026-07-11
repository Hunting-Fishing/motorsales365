
import { NotificationPreferences } from '@/types/notification';

export const createUpdatePreferencesHandler = (
  setPreferences: React.Dispatch<React.SetStateAction<NotificationPreferences>>
) => {
  return (updates: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };
};

export const createUpdateSubscriptionHandler = (
  setPreferences: React.Dispatch<React.SetStateAction<NotificationPreferences>>
) => {
  return (category: keyof NotificationPreferences['categories'], enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: enabled
      }
    }));
  };
};
