import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Plus, Save, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { productPriceHistoryService } from '@/services/productPriceHistoryService';

interface Product {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  price?: number;
  image_url?: string;
  affiliate_link?: string;
  category_id?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleSlug: string;
  editProduct?: Product | null;
}

export function AddProductDialog({ 
  open, 
  onOpenChange, 
  moduleSlug,
  editProduct 
}: AddProductDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    affiliateLink: '',
    categoryId: '',
  });

  const isEditing = !!editProduct;

  // Fetch categories from database
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, slug')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    },
  });

  // Reset form when dialog opens/closes or editProduct changes
  useEffect(() => {
    if (open) {
      if (editProduct) {
        setFormData({
          name: editProduct.title || editProduct.name || '',
          description: editProduct.description || '',
          price: editProduct.price?.toString() || '',
          imageUrl: editProduct.image_url || '',
          affiliateLink: editProduct.affiliate_link || '',
          categoryId: editProduct.category_id || '',
        });
        setOriginalPrice(editProduct.price || null);
      } else {
        setFormData({
          name: '',
          description: '',
          price: '',
          imageUrl: '',
          affiliateLink: '',
          categoryId: '',
        });
        setOriginalPrice(null);
      }
      setDuplicateWarning(null);
    }
  }, [open, editProduct]);

  // Check for duplicate affiliate link
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!formData.affiliateLink?.trim()) {
        setDuplicateWarning(null);
        return;
      }

      const { data: existing } = await supabase
        .from('products')
        .select('id, title, name')
        .eq('affiliate_link', formData.affiliateLink.trim())
        .maybeSingle();

      if (existing && (!isEditing || existing.id !== editProduct?.id)) {
        setDuplicateWarning(
          `This affiliate link already exists for product: "${existing.title || existing.name}"`
        );
      } else {
        setDuplicateWarning(null);
      }
    };

    const debounce = setTimeout(checkDuplicate, 300);
    return () => clearTimeout(debounce);
  }, [formData.affiliateLink, isEditing, editProduct?.id]);

  const handleRefreshPrice = async () => {
    if (!formData.affiliateLink?.trim()) {
      toast.error('Please enter an affiliate link first');
      return;
    }

    setIsFetchingPrice(true);

    try {
      const result = await firecrawlApi.fetchProductPrice(formData.affiliateLink.trim());

      if (result.success && result.data) {
        const newPrice = result.data.price;
        
        if (newPrice !== undefined && newPrice !== null) {
          setFormData(prev => ({
            ...prev,
            price: newPrice.toString(),
            // Optionally update other fields if empty
            name: prev.name || result.data?.title || prev.name,
            imageUrl: prev.imageUrl || result.data?.imageUrl || prev.imageUrl,
          }));
          
          toast.success(`Price updated: $${newPrice.toFixed(2)}`);
          
          if (result.data.availability) {
            toast.info(`Availability: ${result.data.availability}`);
          }
        } else {
          toast.warning('Could not extract price from the page');
        }
      } else {
        toast.error(result.error || 'Failed to fetch price');
      }
    } catch (error) {
      console.error('Error fetching price:', error);
      toast.error('Failed to fetch price from link');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (duplicateWarning) {
      toast.error('Please use a unique affiliate link');
      return;
    }

    setIsSubmitting(true);

    try {
      const priceValue = formData.price ? parseFloat(formData.price) : null;
      
      const productData: any = {
        title: formData.name.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: priceValue,
        image_url: formData.imageUrl.trim() || null,
        affiliate_link: formData.affiliateLink.trim() || null,
        module_id: moduleSlug,
        is_approved: true,
        category_id: formData.categoryId || null,
      };

      if (isEditing && editProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editProduct.id);

        if (error) throw error;

        // Track price change if price was modified
        if (originalPrice !== null && priceValue !== null && originalPrice !== priceValue) {
          try {
            await productPriceHistoryService.trackPriceChange(
              editProduct.id,
              originalPrice,
              priceValue
            );
          } catch (historyError) {
            console.error('Failed to track price history:', historyError);
            // Don't fail the save if history tracking fails
          }
        }

        toast.success('Product updated successfully');
      } else {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert([productData])
          .select('id')
          .single();

        if (error) throw error;

        // Record initial price if set
        if (priceValue !== null && newProduct) {
          try {
            await productPriceHistoryService.addPriceEntry(
              newProduct.id,
              priceValue,
              undefined,
              'Initial price set'
            );
          } catch (historyError) {
            console.error('Failed to record initial price:', historyError);
          }
        }

        toast.success('Product added successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['module-products', moduleSlug] });
      queryClient.invalidateQueries({ queryKey: ['module-product-count', moduleSlug] });
      queryClient.invalidateQueries({ queryKey: ['price-history'] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(`Failed to save product: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the product details below'
              : 'Add a new product to this module\'s store'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief product description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="affiliateLink">Affiliate Link</Label>
            <div className="flex gap-2">
              <Input
                id="affiliateLink"
                type="url"
                value={formData.affiliateLink}
                onChange={(e) => setFormData({ ...formData, affiliateLink: e.target.value })}
                placeholder="https://amazon.com/dp/..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRefreshPrice}
                disabled={isFetchingPrice || !formData.affiliateLink?.trim()}
                title="Fetch live price from link"
              >
                {isFetchingPrice ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="29.99"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.categoryId || 'uncategorized'}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value === 'uncategorized' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {duplicateWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{duplicateWarning}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !!duplicateWarning}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
