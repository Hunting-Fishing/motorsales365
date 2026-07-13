import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoyaltyTier } from '@/types/loyalty';
import { loyaltySettingsService } from '@/services/settings/loyaltySettingsService';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Crown,
  Loader2,
  GripVertical
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LoyaltyTierManagerProps {
  tiers: LoyaltyTier[];
  onTiersChange: (tiers: LoyaltyTier[]) => void;
}

const TIER_COLORS = [
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'amber', label: 'Gold', class: 'bg-amber-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
];

const getColorClass = (color?: string) => {
  return TIER_COLORS.find(c => c.value === color)?.class || 'bg-gray-500';
};

export function LoyaltyTierManager({ tiers, onTiersChange }: LoyaltyTierManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<LoyaltyTier>>({
    name: '',
    threshold: 0,
    benefits: '',
    multiplier: 1,
    color: 'green'
  });

  // Sort tiers by threshold
  const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold);

  const handleOpenDialog = (tier?: LoyaltyTier) => {
    if (tier) {
      setEditingTier(tier);
      setFormData({
        name: tier.name,
        threshold: tier.threshold,
        benefits: tier.benefits,
        multiplier: tier.multiplier || 1,
        color: tier.color || 'green'
      });
    } else {
      setEditingTier(null);
      setFormData({
        name: '',
        threshold: 0,
        benefits: '',
        multiplier: 1,
        color: 'green'
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTier(null);
    setFormData({
      name: '',
      threshold: 0,
      benefits: '',
      multiplier: 1,
      color: 'green'
    });
  };

  const handleSaveTier = async () => {
    if (!formData.name?.trim()) {
      toast.error('Tier name is required');
      return;
    }

    setIsSaving(true);
    try {
      let updatedTiers: LoyaltyTier[];

      if (editingTier) {
        // Update existing tier
        updatedTiers = tiers.map(t => 
          t.name === editingTier.name && t.threshold === editingTier.threshold
            ? { ...t, ...formData } as LoyaltyTier
            : t
        );
        toast.success('Tier updated successfully');
      } else {
        // Add new tier
        const newTier: LoyaltyTier = {
          id: `tier_${Date.now()}`,
          name: formData.name!,
          threshold: formData.threshold || 0,
          benefits: formData.benefits || '',
          multiplier: formData.multiplier || 1,
          color: formData.color || 'green'
        };
        updatedTiers = [...tiers, newTier];
        toast.success('Tier added successfully');
      }

      // Save to backend
      await loyaltySettingsService.updateTierTemplates(updatedTiers);
      onTiersChange(updatedTiers);
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving tier:', error);
      toast.error('Failed to save tier');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTier = async (tierToDelete: LoyaltyTier) => {
    // Prevent deleting the base tier (threshold 0)
    if (tierToDelete.threshold === 0) {
      toast.error('Cannot delete the base tier');
      return;
    }

    setIsSaving(true);
    try {
      const updatedTiers = tiers.filter(t => 
        !(t.name === tierToDelete.name && t.threshold === tierToDelete.threshold)
      );
      
      await loyaltySettingsService.updateTierTemplates(updatedTiers);
      onTiersChange(updatedTiers);
      toast.success('Tier deleted successfully');
    } catch (error) {
      console.error('Error deleting tier:', error);
      toast.error('Failed to delete tier');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Loyalty Tiers
              </CardTitle>
              <CardDescription>
                Configure loyalty program tiers and their benefits
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Tier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedTiers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No loyalty tiers configured</p>
              <p className="text-sm">Add your first tier to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTiers.map((tier, index) => (
                <div
                  key={`${tier.name}-${tier.threshold}`}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getColorClass(tier.color)}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{tier.name}</h4>
                      {tier.threshold === 0 && (
                        <Badge variant="secondary" className="text-xs">Base</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {tier.benefits || 'No benefits configured'}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">
                        {tier.threshold.toLocaleString()} points to reach
                      </Badge>
                      {tier.multiplier && tier.multiplier !== 1 && (
                        <Badge variant="outline">
                          {tier.multiplier}x points multiplier
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(tier)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {tier.threshold !== 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTier(tier)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        disabled={isSaving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTier ? 'Edit Tier' : 'Add New Tier'}
            </DialogTitle>
            <DialogDescription>
              Configure the tier details and benefits
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tier Name</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Gold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Select
                  value={formData.color || 'green'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_COLORS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="threshold">Points Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  value={formData.threshold || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Points needed to reach this tier
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="multiplier">Points Multiplier</Label>
                <Input
                  id="multiplier"
                  type="number"
                  min="1"
                  step="0.05"
                  value={formData.multiplier || 1}
                  onChange={(e) => setFormData(prev => ({ ...prev, multiplier: parseFloat(e.target.value) || 1 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Bonus multiplier for points earned
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefits">Benefits</Label>
              <Textarea
                id="benefits"
                value={formData.benefits || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, benefits: e.target.value }))}
                placeholder="Describe the benefits for this tier..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveTier} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Tier
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
