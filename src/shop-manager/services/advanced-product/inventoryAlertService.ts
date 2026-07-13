// Inventory Alert Service
import { supabase } from '@/integrations/supabase/client';
import { InventoryAlert } from '@/types/advanced-product';

export class InventoryAlertService {
  // Get all active alerts
  async getActiveAlerts(filters?: {
    alert_type?: string;
    limit?: number;
  }): Promise<InventoryAlert[]> {
    let query = supabase
      .from('inventory_alerts')
      .select(`
        *,
        products (title, image_url),
        product_variants (variant_name, variant_value)
      `)
      .eq('status', 'active');

    if (filters?.alert_type) {
      query = query.eq('alert_type', filters.alert_type);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(this.transformAlert);
  }

  // Get alerts for a specific product
  async getProductAlerts(productId: string): Promise<InventoryAlert[]> {
    const { data, error } = await supabase
      .from('inventory_alerts')
      .select(`
        *,
        products (title, image_url),
        product_variants (variant_name, variant_value)
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.transformAlert);
  }

  // Get alerts for a specific variant
  async getVariantAlerts(variantId: string): Promise<InventoryAlert[]> {
    const { data, error } = await supabase
      .from('inventory_alerts')
      .select(`
        *,
        products (title, image_url),
        product_variants (variant_name, variant_value)
      `)
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.transformAlert);
  }

  // Acknowledge alert
  async acknowledgeAlert(alertId: string, userId?: string): Promise<InventoryAlert> {
    const { data, error } = await supabase
      .from('inventory_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select(`
        *,
        products (title, image_url),
        product_variants (variant_name, variant_value)
      `)
      .single();

    if (error) throw error;
    return this.transformAlert(data);
  }

  // Resolve alert
  async resolveAlert(alertId: string): Promise<InventoryAlert> {
    const { data, error } = await supabase
      .from('inventory_alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select(`
        *,
        products (title, image_url),
        product_variants (variant_name, variant_value)
      `)
      .single();

    if (error) throw error;
    return this.transformAlert(data);
  }

  // Create manual alert
  async createAlert(alertData: {
    product_id?: string;
    variant_id?: string;
    alert_type: 'low_stock' | 'out_of_stock' | 'overstocked' | 'reorder_point';
    threshold_value: number;
    current_value: number;
    message?: string;
  }): Promise<InventoryAlert> {
    const { data, error } = await supabase
      .from('inventory_alerts')
      .insert(alertData)
      .select(`
        *,
        products (title, image_url),
        product_variants (variant_name, variant_value)
      `)
      .single();

    if (error) throw error;
    return this.transformAlert(data);
  }

  // Get alert statistics
  async getAlertStats(): Promise<{
    total_active: number;
    by_type: Record<string, number>;
    critical_count: number;
    recent_count: number;
  }> {
    // Get all active alerts
    const { data: activeAlerts, error: activeError } = await supabase
      .from('inventory_alerts')
      .select('alert_type, created_at')
      .eq('status', 'active');

    if (activeError) throw activeError;

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats = {
      total_active: activeAlerts?.length || 0,
      by_type: {} as Record<string, number>,
      critical_count: 0,
      recent_count: 0
    };

    activeAlerts?.forEach(alert => {
      // Count by type
      stats.by_type[alert.alert_type] = (stats.by_type[alert.alert_type] || 0) + 1;

      // Count critical (out_of_stock alerts)
      if (alert.alert_type === 'out_of_stock') {
        stats.critical_count++;
      }

      // Count recent (last 24 hours)
      if (new Date(alert.created_at) > last24Hours) {
        stats.recent_count++;
      }
    });

    return stats;
  }

  // Check and create stock alerts for products
  async checkStockLevels(): Promise<InventoryAlert[]> {
    const createdAlerts: InventoryAlert[] = [];

    // Check products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, stock_quantity, low_stock_threshold')
      .filter('stock_quantity', 'lte', 'low_stock_threshold');

    if (productsError) throw productsError;

    for (const product of products || []) {
      // Check if alert already exists
      const { data: existingAlert } = await supabase
        .from('inventory_alerts')
        .select('id')
        .eq('product_id', product.id)
        .eq('status', 'active')
        .single();

      if (!existingAlert) {
        const alertType = product.stock_quantity === 0 ? 'out_of_stock' : 'low_stock';
        const alert = await this.createAlert({
          product_id: product.id,
          alert_type: alertType,
          threshold_value: product.low_stock_threshold,
          current_value: product.stock_quantity,
          message: `${product.title} is ${alertType === 'out_of_stock' ? 'out of stock' : 'running low'}`
        });
        createdAlerts.push(alert);
      }
    }

    // Check variants
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('id, variant_name, variant_value, stock_quantity')
      .lte('stock_quantity', 5)
      .eq('is_available', true);

    if (variantsError) throw variantsError;

    for (const variant of variants || []) {
      // Check if alert already exists
      const { data: existingAlert } = await supabase
        .from('inventory_alerts')
        .select('id')
        .eq('variant_id', variant.id)
        .eq('status', 'active')
        .single();

      if (!existingAlert) {
        const alertType = variant.stock_quantity === 0 ? 'out_of_stock' : 'low_stock';
        const alert = await this.createAlert({
          variant_id: variant.id,
          alert_type: alertType,
          threshold_value: 5,
          current_value: variant.stock_quantity,
          message: `Variant ${variant.variant_name} (${variant.variant_value}) is ${alertType === 'out_of_stock' ? 'out of stock' : 'running low'}`
        });
        createdAlerts.push(alert);
      }
    }

    return createdAlerts;
  }

  // Mark alerts as notification sent
  async markNotificationSent(alertIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('inventory_alerts')
      .update({ notification_sent: true })
      .in('id', alertIds);

    if (error) throw error;
  }

  // Private helper to transform database result
  private transformAlert(data: any): InventoryAlert {
    return {
      id: data.id,
      product_id: data.product_id,
      variant_id: data.variant_id,
      alert_type: data.alert_type,
      threshold_value: data.threshold_value,
      current_value: data.current_value,
      status: data.status,
      message: data.message,
      acknowledged_by: data.acknowledged_by,
      acknowledged_at: data.acknowledged_at,
      created_at: data.created_at,
      resolved_at: data.resolved_at,
      notification_sent: data.notification_sent,
      product: data.products ? {
        title: data.products.title,
        image_url: data.products.image_url
      } : undefined,
      variant: data.product_variants ? {
        variant_name: data.product_variants.variant_name,
        variant_value: data.product_variants.variant_value
      } : undefined
    };
  }
}

export const inventoryAlertService = new InventoryAlertService();