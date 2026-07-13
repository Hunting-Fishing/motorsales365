import { supabase } from '@/integrations/supabase/client';
import { unifiedSettingsService } from '@/services/unified/unifiedSettingsService';

export interface WorkOrderOption {
  value: string;
  label: string;
}

export interface WorkOrderDefaults {
  status: string;
  priority: string;
}

class WorkOrderSettingsService {
  private readonly CATEGORY = 'work_order';

  private async getShopId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (error || !profile?.shop_id) {
      throw new Error('Shop not found for user');
    }

    return profile.shop_id;
  }

  async getAvailableStatuses(): Promise<WorkOrderOption[]> {
    try {
      const shopId = await this.getShopId();
      const setting = await unifiedSettingsService.getSetting(shopId, this.CATEGORY, 'available_statuses');
      return setting || this.getFallbackStatuses();
    } catch (error) {
      console.error('Error fetching work order statuses:', error);
      return this.getFallbackStatuses();
    }
  }

  async getAvailablePriorities(): Promise<WorkOrderOption[]> {
    try {
      const shopId = await this.getShopId();
      const setting = await unifiedSettingsService.getSetting(shopId, this.CATEGORY, 'available_priorities');
      return setting || this.getFallbackPriorities();
    } catch (error) {
      console.error('Error fetching work order priorities:', error);
      return this.getFallbackPriorities();
    }
  }

  async getDefaults(): Promise<WorkOrderDefaults> {
    try {
      const shopId = await this.getShopId();
      const [defaultStatus, defaultPriority] = await Promise.all([
        unifiedSettingsService.getSetting(shopId, this.CATEGORY, 'default_status'),
        unifiedSettingsService.getSetting(shopId, this.CATEGORY, 'default_priority')
      ]);

      return {
        status: defaultStatus || 'pending',
        priority: defaultPriority || 'medium'
      };
    } catch (error) {
      console.error('Error fetching work order defaults:', error);
      return {
        status: 'pending',
        priority: 'medium'
      };
    }
  }

  async updateAvailableStatuses(statuses: WorkOrderOption[]): Promise<void> {
    const shopId = await this.getShopId();
    await unifiedSettingsService.setSetting(shopId, this.CATEGORY, 'available_statuses', statuses);
  }

  async updateAvailablePriorities(priorities: WorkOrderOption[]): Promise<void> {
    const shopId = await this.getShopId();
    await unifiedSettingsService.setSetting(shopId, this.CATEGORY, 'available_priorities', priorities);
  }

  async updateDefaults(defaults: Partial<WorkOrderDefaults>): Promise<void> {
    const shopId = await this.getShopId();
    const updates = [];
    
    if (defaults.status) {
      updates.push(unifiedSettingsService.setSetting(shopId, this.CATEGORY, 'default_status', defaults.status));
    }
    
    if (defaults.priority) {
      updates.push(unifiedSettingsService.setSetting(shopId, this.CATEGORY, 'default_priority', defaults.priority));
    }

    await Promise.all(updates);
  }

  private getFallbackStatuses(): WorkOrderOption[] {
    return [
      { value: 'pending', label: 'Pending' },
      { value: 'in-progress', label: 'In Progress' },
      { value: 'on-hold', label: 'On Hold' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'body-shop', label: 'Body Shop' },
      { value: 'mobile-service', label: 'Mobile Service' },
      { value: 'needs-road-test', label: 'Needs Road Test' },
      { value: 'parts-requested', label: 'Parts Requested' },
      { value: 'parts-ordered', label: 'Parts Ordered' },
      { value: 'parts-arrived', label: 'Parts Arrived' },
      { value: 'customer-to-return', label: 'Customer to Return' },
      { value: 'rebooked', label: 'Rebooked' },
      { value: 'foreman-signoff-waiting', label: 'Foreman Sign-off Waiting' },
      { value: 'foreman-signoff-complete', label: 'Foreman Sign-off Complete' },
      { value: 'sublet', label: 'Sublet' },
      { value: 'waiting-customer-auth', label: 'Waiting for Customer Auth' },
      { value: 'po-requested', label: 'PO Requested' },
      { value: 'tech-support', label: 'Tech Support' },
      { value: 'warranty', label: 'Warranty' },
      { value: 'internal-ro', label: 'Internal RO' }
    ];
  }

  private getFallbackPriorities(): WorkOrderOption[] {
    return [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' }
    ];
  }
}

export const workOrderSettingsService = new WorkOrderSettingsService();