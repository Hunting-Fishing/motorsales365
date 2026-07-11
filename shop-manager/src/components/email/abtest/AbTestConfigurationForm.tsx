
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ABTestVariant {
  id: string;
  name: string;
  subject: string;
  content: string;
  recipientPercentage: number;
}

interface ABTestConfigProps {
  initialData?: {
    variants: ABTestVariant[];
    winnerCriteria: string;
  };
  onSave: (data: any) => void;
}

export const AbTestConfigurationForm = ({ initialData, onSave }: ABTestConfigProps) => {
  const [variants, setVariants] = useState<ABTestVariant[]>(
    initialData?.variants || [
      {
        id: 'variant-a',
        name: 'Variant A',
        subject: '',
        content: '',
        recipientPercentage: 50
      },
      {
        id: 'variant-b',
        name: 'Variant B',
        subject: '',
        content: '',
        recipientPercentage: 50
      }
    ]
  );
  
  const [winnerCriteria, setWinnerCriteria] = useState(initialData?.winnerCriteria || 'open_rate');
  const [selectedVariantTab, setSelectedVariantTab] = useState('variant-a');
  
  useEffect(() => {
    // Ensure percentages add up to 100%
    const totalPercentage = variants.reduce((sum, variant) => sum + variant.recipientPercentage, 0);
    
    if (totalPercentage !== 100 && variants.length > 0) {
      const adjustedVariants = [...variants];
      const lastVariant = adjustedVariants[adjustedVariants.length - 1];
      lastVariant.recipientPercentage = 100 - (totalPercentage - lastVariant.recipientPercentage);
      setVariants(adjustedVariants);
    }
  }, [variants]);
  
  const updateVariant = (id: string, field: string, value: any) => {
    setVariants(prevVariants => 
      prevVariants.map(variant => 
        variant.id === id ? { ...variant, [field]: value } : variant
      )
    );
  };
  
  const handlePercentageChange = (id: string, newPercentage: number) => {
    // Get current variant
    const currentVariant = variants.find(v => v.id === id);
    if (!currentVariant) return;
    
    // Calculate change in percentage
    const change = newPercentage - currentVariant.recipientPercentage;
    
    // Don't allow less than 5% or more than 95%
    if (newPercentage < 5 || newPercentage > 95) return;
    
    // Update all variants
    const updatedVariants = [...variants];
    
    // Update current variant
    const currentIndex = updatedVariants.findIndex(v => v.id === id);
    updatedVariants[currentIndex].recipientPercentage = newPercentage;
    
    // Distribute the change across other variants proportionally
    const otherVariants = updatedVariants.filter(v => v.id !== id);
    const totalOtherPercentage = otherVariants.reduce((sum, v) => sum + v.recipientPercentage, 0);
    
    if (totalOtherPercentage === 0 || otherVariants.length === 0) return;
    
    otherVariants.forEach(variant => {
      const proportion = variant.recipientPercentage / totalOtherPercentage;
      const variantIndex = updatedVariants.findIndex(v => v.id === variant.id);
      updatedVariants[variantIndex].recipientPercentage -= change * proportion;
      
      // Ensure no negative percentages
      if (updatedVariants[variantIndex].recipientPercentage < 5) {
        updatedVariants[variantIndex].recipientPercentage = 5;
      }
    });
    
    // Round all percentages to integers and ensure they sum to 100%
    let roundedSum = 0;
    updatedVariants.forEach(variant => {
      variant.recipientPercentage = Math.round(variant.recipientPercentage);
      roundedSum += variant.recipientPercentage;
    });
    
    // Adjust last variant to ensure 100% total
    if (roundedSum !== 100) {
      updatedVariants[updatedVariants.length - 1].recipientPercentage += (100 - roundedSum);
    }
    
    setVariants(updatedVariants);
  };
  
  const handleSave = () => {
    const isValid = variants.every(variant => variant.subject && variant.content);
    
    if (!isValid) {
      alert('All variants must have a subject and content');
      return;
    }
    
    onSave({
      variants,
      winnerCriteria,
      enabled: true
    });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>A/B Test Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Winner Selection Criteria</Label>
            <Select value={winnerCriteria} onValueChange={setWinnerCriteria}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open_rate">Open Rate</SelectItem>
                <SelectItem value="click_rate">Click Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Audience Split</Label>
            <div className="flex flex-col space-y-3">
              {variants.map((variant, index) => (
                <div key={variant.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{variant.name}</span>
                    <span>{variant.recipientPercentage}%</span>
                  </div>
                  <Slider
                    value={[variant.recipientPercentage]}
                    min={5}
                    max={95}
                    step={1}
                    onValueChange={(values) => handlePercentageChange(variant.id, values[0])}
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <Label>Variant Content</Label>
            <Tabs value={selectedVariantTab} onValueChange={setSelectedVariantTab}>
              <TabsList className="w-full">
                {variants.map((variant) => (
                  <TabsTrigger key={variant.id} value={variant.id} className="flex-1">
                    {variant.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {variants.map((variant) => (
                <TabsContent key={variant.id} value={variant.id} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${variant.id}-name`}>Variant Name</Label>
                    <Input
                      id={`${variant.id}-name`}
                      value={variant.name}
                      onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                      placeholder="e.g. Discount Offer"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`${variant.id}-subject`}>Email Subject</Label>
                    <Input
                      id={`${variant.id}-subject`}
                      value={variant.subject}
                      onChange={(e) => updateVariant(variant.id, 'subject', e.target.value)}
                      placeholder="e.g. Special Offer Inside!"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`${variant.id}-content`}>Email Content</Label>
                    <Textarea
                      id={`${variant.id}-content`}
                      value={variant.content}
                      onChange={(e) => updateVariant(variant.id, 'content', e.target.value)}
                      placeholder="Enter email content..."
                      rows={10}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSave}>
              Save A/B Test Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
