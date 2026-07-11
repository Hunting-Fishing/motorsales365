import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useShopId } from "@/hooks/useShopId";

interface AddWaterProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWaterProductDialog({ open, onOpenChange }: AddWaterProductDialogProps) {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();
  
  const [formData, setFormData] = useState({
    product_name: "",
    water_type: "potable",
    ph_level: "",
    tds_ppm: "",
    certification: "",
    grade: "",
    base_price_per_unit: ""
  });

  const createProduct = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!shopId) throw new Error("Shop ID required");
      
      const { error } = await supabase
        .from('water_delivery_products')
        .insert({
          shop_id: shopId,
          product_name: data.product_name,
          water_type: data.water_type,
          ph_level: data.ph_level ? parseFloat(data.ph_level) : null,
          tds_ppm: data.tds_ppm ? parseInt(data.tds_ppm) : null,
          certification: data.certification || null,
          grade: data.grade || null,
          base_price_per_unit: data.base_price_per_unit ? parseFloat(data.base_price_per_unit) : 0,
          is_active: true
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-products'] });
      toast.success("Product added successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add product");
    }
  });

  const resetForm = () => {
    setFormData({
      product_name: "",
      water_type: "potable",
      ph_level: "",
      tds_ppm: "",
      certification: "",
      grade: "",
      base_price_per_unit: ""
    });
  };

  const handleSubmit = () => {
    if (!formData.product_name) {
      toast.error("Product name is required");
      return;
    }
    createProduct.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Water Product</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Product Name *</Label>
            <Input
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              placeholder="e.g., Premium Potable Water"
            />
          </div>

          <div className="space-y-2">
            <Label>Water Type *</Label>
            <Select
              value={formData.water_type}
              onValueChange={(value) => setFormData({ ...formData, water_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="potable">Potable</SelectItem>
                <SelectItem value="non-potable">Non-Potable</SelectItem>
                <SelectItem value="reclaimed">Reclaimed</SelectItem>
                <SelectItem value="distilled">Distilled</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>pH Level</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.ph_level}
                onChange={(e) => setFormData({ ...formData, ph_level: e.target.value })}
                placeholder="7.0"
              />
            </div>
            <div className="space-y-2">
              <Label>TDS (ppm)</Label>
              <Input
                type="number"
                value={formData.tds_ppm}
                onChange={(e) => setFormData({ ...formData, tds_ppm: e.target.value })}
                placeholder="150"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Certification</Label>
              <Input
                value={formData.certification}
                onChange={(e) => setFormData({ ...formData, certification: e.target.value })}
                placeholder="e.g., EPA Certified"
              />
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
              <Input
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                placeholder="e.g., A"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Base Price (per gallon)</Label>
            <Input
              type="number"
              step="0.0001"
              value={formData.base_price_per_unit}
              onChange={(e) => setFormData({ ...formData, base_price_per_unit: e.target.value })}
              placeholder="0.0200"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createProduct.isPending}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {createProduct.isPending ? "Adding..." : "Add Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
