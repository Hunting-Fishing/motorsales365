import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Pill } from 'lucide-react';
import { SupplementCard } from '@/components/personal-trainer/supplements/SupplementCard';
import { SupplementSearch } from '@/components/personal-trainer/supplements/SupplementSearch';
import { NutritionixSearch } from '@/components/personal-trainer/supplements/NutritionixSearch';
import { ClientSupplementStack } from '@/components/personal-trainer/supplements/ClientSupplementStack';
import { VitaminGuide } from '@/components/personal-trainer/supplements/VitaminGuide';
import { SupplementDetailDialog } from '@/components/personal-trainer/supplements/SupplementDetailDialog';
import { AffiliateSettingsCard } from '@/components/personal-trainer/supplements/AffiliateSettingsCard';
import { BrandsTab } from '@/components/personal-trainer/supplements/BrandsTab';
import { useShopId } from '@/hooks/useShopId';

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'vitamin', label: 'Vitamins' },
  { value: 'mineral', label: 'Minerals' },
  { value: 'amino_acid', label: 'Amino Acids' },
  { value: 'protein', label: 'Proteins' },
  { value: 'herb', label: 'Herbs' },
  { value: 'pre_workout', label: 'Pre-Workout' },
  { value: 'post_workout', label: 'Post-Workout' },
  { value: 'fat_burner', label: 'Fat Burner' },
  { value: 'joint_support', label: 'Joint Support' },
  { value: 'essential_oil', label: 'Essential Oils' },
  { value: 'oil_blend', label: 'Oil Blends' },
  { value: 'other', label: 'Other' },
];

export default function PersonalTrainerSupplements() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<any>(null);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('browse');
  const { shopId } = useShopId();

  const { data: supplements = [], isLoading } = useQuery({
    queryKey: ['pt-supplements'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pt_supplements')
        .select('*, pt_supplement_brands(name)')
        .order('category')
        .order('name');
      return (data || []) as any[];
    },
  });

  const { data: affiliateSettings } = useQuery({
    queryKey: ['affiliate-settings', shopId],
    queryFn: async () => {
      const { data } = await supabase
        .from('pt_shop_affiliate_settings' as any)
        .select('*')
        .eq('shop_id', shopId!)
        .maybeSingle();
      return data as any;
    },
    enabled: !!shopId,
  });

  const affiliateTag = affiliateSettings?.amazon_associate_tag;

  const filtered = supplements.filter((s: any) => {
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || s.category === category;
    const matchesBrand = !brandFilter || s.brand_id === brandFilter;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  const handleBrandSelect = (brandId: string, brandName: string) => {
    setBrandFilter(brandId);
    setSearch('');
    setCategory('all');
    setActiveTab('browse');
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
          <Pill className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supplements</h1>
          <p className="text-sm text-muted-foreground">Browse vitamins, minerals, essential oils, and supplements</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="browse">Browse Catalog</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="guide">Vitamin Guide</TabsTrigger>
          <TabsTrigger value="search">Search Products</TabsTrigger>
          <TabsTrigger value="stacks">Client Stacks</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search supplements..." value={search}
                onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {brandFilter && (
              <button
                onClick={() => setBrandFilter(null)}
                className="text-xs text-primary hover:underline px-2 py-1"
              >
                Clear brand filter ✕
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((s: any) => (
                <SupplementCard
                  key={s.id}
                  name={s.name}
                  category={s.category}
                  description={s.description}
                  recommendedDose={s.recommended_dose}
                  benefits={s.benefits}
                  isSponsored={s.is_sponsored}
                  imageUrl={s.image_url}
                  price={s.price}
                  affiliateLink={s.affiliate_link}
                  brandName={s.pt_supplement_brands?.name}
                  amazonAsin={s.amazon_asin}
                  affiliateTag={affiliateTag}
                  bestTimeToTake={s.best_time_to_take}
                  productType={s.product_type}
                  onClick={() => setSelected(s)}
                />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No supplements match your filters.</p>
          )}
        </TabsContent>

        <TabsContent value="brands">
          <BrandsTab onSelectBrand={handleBrandSelect} />
        </TabsContent>

        <TabsContent value="guide">
          <VitaminGuide />
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <NutritionixSearch />
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Open Food Facts (Free Database)</h3>
            <SupplementSearch />
          </div>
        </TabsContent>

        <TabsContent value="stacks">
          <ClientSupplementStack />
        </TabsContent>

        <TabsContent value="settings" className="max-w-md">
          <AffiliateSettingsCard />
        </TabsContent>
      </Tabs>

      <SupplementDetailDialog
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        supplement={selected}
        affiliateTag={affiliateTag}
      />
    </div>
  );
}
