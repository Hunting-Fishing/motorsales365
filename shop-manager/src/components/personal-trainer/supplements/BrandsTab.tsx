import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Plus } from 'lucide-react';
import { BrandCard } from './BrandCard';
import { AddBrandDialog } from './AddBrandDialog';

interface BrandsTabProps {
  onSelectBrand?: (brandId: string, brandName: string) => void;
}

export function BrandsTab({ onSelectBrand }: BrandsTabProps) {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['pt-brands'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pt_supplement_brands')
        .select('*')
        .order('name');
      return (data || []) as any[];
    },
  });

  const { data: productCounts = {} } = useQuery({
    queryKey: ['pt-brand-product-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pt_supplements')
        .select('brand_id');
      const counts: Record<string, number> = {};
      (data || []).forEach((s: any) => {
        if (s.brand_id) counts[s.brand_id] = (counts[s.brand_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filtered = brands.filter((b: any) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.country || '').toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search brands..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Add Brand
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((b: any) => (
          <BrandCard
            key={b.id}
            name={b.name}
            website={b.website}
            country={b.country}
            category={b.category}
            description={b.description}
            isSponsor={b.is_sponsor}
            productCount={productCounts[b.id] || 0}
            onClick={() => onSelectBrand?.(b.id, b.name)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No brands found.</p>
      )}

      <AddBrandDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
