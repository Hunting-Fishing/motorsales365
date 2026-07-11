import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function ExportInventory() {
  const { shopId } = useShopId();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('export_inventory').select('*, export_products(name, category), export_warehouses(name)').eq('shop_id', shopId).order('created_at', { ascending: false });
      setInventory(data || []);
      setLoading(false);
    })();
  }, [shopId]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Export Inventory</h1>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : inventory.length === 0 ? <p className="text-center text-muted-foreground py-8">No inventory records. Add products and warehouse stock.</p> : (
        <div className="space-y-3">
          {inventory.map(i => {
            const low = Number(i.quantity) <= Number(i.reorder_level || 0);
            return (
              <Card key={i.id}><CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{(i as any).export_products?.name || 'Unknown Product'}</p>
                  <p className="text-sm text-muted-foreground">{(i as any).export_warehouses?.name || 'No warehouse'} • Lot: {i.lot_number || 'N/A'}</p>
                  {i.expiry_date && <p className="text-xs text-muted-foreground">Expires: {new Date(i.expiry_date).toLocaleDateString()}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{Number(i.quantity).toLocaleString()} {i.unit}</p>
                  {low && <div className="flex items-center gap-1 text-amber-500 text-xs"><AlertTriangle className="h-3 w-3" /> Low Stock</div>}
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
