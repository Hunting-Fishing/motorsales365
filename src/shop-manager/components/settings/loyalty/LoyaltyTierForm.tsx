
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoyaltyTier } from "@/types/loyalty";

interface LoyaltyTierFormProps {
  tier?: LoyaltyTier;
  onSave: (tier: LoyaltyTier) => void;
  onCancel: () => void;
}

export function LoyaltyTierForm({ tier, onSave, onCancel }: LoyaltyTierFormProps) {
  const [formData, setFormData] = useState<LoyaltyTier>({
    id: tier?.id,
    name: tier?.name || '',
    threshold: tier?.threshold || 0,
    benefits: tier?.benefits || '',
    multiplier: tier?.multiplier || 1,
    color: tier?.color || 'blue',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'threshold' || name === 'multiplier' ? Number(value) : value,
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (formData.threshold < 0) {
      newErrors.threshold = 'Points threshold cannot be negative';
    }
    
    if (formData.multiplier <= 0) {
      newErrors.multiplier = 'Multiplier must be greater than zero';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="name">Tier Name</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="threshold">Points Threshold</Label>
        <Input
          id="threshold"
          name="threshold"
          type="number"
          min="0"
          value={formData.threshold}
          onChange={handleChange}
          className={errors.threshold ? 'border-red-500' : ''}
        />
        {errors.threshold && <p className="text-sm text-red-500">{errors.threshold}</p>}
        <p className="text-xs text-muted-foreground">
          Minimum points required to achieve this tier
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="multiplier">Points Multiplier</Label>
        <Input
          id="multiplier"
          name="multiplier"
          type="number"
          min="0.1"
          step="0.05"
          value={formData.multiplier}
          onChange={handleChange}
          className={errors.multiplier ? 'border-red-500' : ''}
        />
        {errors.multiplier && <p className="text-sm text-red-500">{errors.multiplier}</p>}
        <p className="text-xs text-muted-foreground">
          Points multiplier for this tier (e.g., 1.1 means 10% more points)
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="benefits">Benefits</Label>
        <Textarea
          id="benefits"
          name="benefits"
          value={formData.benefits || ''}
          onChange={handleChange}
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="color">Display Color</Label>
        <div className="flex space-x-2">
          {['green', 'blue', 'purple', 'amber', 'red', 'teal'].map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-full transition-all ${
                formData.color === color ? 'ring-2 ring-offset-2 ring-black' : ''
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setFormData((prev) => ({ ...prev, color }))}
            />
          ))}
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-esm-blue-600 hover:bg-esm-blue-700">
          Save Tier
        </Button>
      </div>
    </form>
  );
}
