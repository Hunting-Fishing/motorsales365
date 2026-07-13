import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle } from 'lucide-react';

interface ProductSubmission {
  product_name: string;
  product_url: string;
  suggested_category: string;
  notes?: string;
  module_id?: string;
}

interface SubmitProductFormProps {
  onSuccess?: () => void;
  showCard?: boolean;
  moduleId?: string;
}

export function SubmitProductForm({ onSuccess, showCard = false, moduleId }: SubmitProductFormProps) {
  const [formData, setFormData] = useState<ProductSubmission>({
    product_name: '',
    product_url: '',
    suggested_category: '',
    notes: '',
    module_id: moduleId || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert into product_submissions table
      const { error } = await supabase
        .from('product_submissions')
        .insert({
          product_name: formData.product_name,
          product_url: formData.product_url,
          suggested_category: formData.suggested_category,
          notes: formData.notes || null,
          suggested_by: user?.id || null,
          status: 'pending',
          module_id: moduleId || null,
        });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Product Submitted",
        description: "Your product suggestion has been submitted for review. We'll add it to the store once approved!",
      });

      // Reset form after a delay
      setTimeout(() => {
        setFormData({
          product_name: '',
          product_url: '',
          suggested_category: '',
          notes: '',
          module_id: moduleId || ''
        });
        setIsSubmitted(false);
        onSuccess?.();
      }, 2000);
    } catch (error) {
      console.error('Error submitting product:', error);
      toast({
        title: "Error",
        description: "Failed to submit product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = isSubmitted ? (
    <div className="text-center py-8">
      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">Thank You!</h3>
      <p className="text-muted-foreground">
        Your suggestion has been submitted and is pending review.
      </p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="product_name">Product Name *</Label>
        <Input
          id="product_name"
          value={formData.product_name}
          onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
          placeholder="Enter product name"
          required
        />
      </div>

      <div>
        <Label htmlFor="product_url">Product URL *</Label>
        <Input
          id="product_url"
          type="url"
          value={formData.product_url}
          onChange={(e) => setFormData({ ...formData, product_url: e.target.value })}
          placeholder="https://amazon.com/product..."
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Paste the Amazon or retailer URL for the product
        </p>
      </div>

      <div>
        <Label htmlFor="suggested_category">Category *</Label>
        <Select 
          value={formData.suggested_category} 
          onValueChange={(value) => setFormData({ ...formData, suggested_category: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tools">Tools</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="parts">Parts</SelectItem>
            <SelectItem value="accessories">Accessories</SelectItem>
            <SelectItem value="safety">Safety Gear</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Why do you recommend this? (Optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Tell us why this product would be valuable..."
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Submitting...' : 'Submit Product Suggestion'}
      </Button>
    </form>
  );

  if (showCard) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Submit a Product</CardTitle>
          <CardDescription>
            Suggest a new product to be added to our affiliate store
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formContent}
        </CardContent>
      </Card>
    );
  }

  return formContent;
}
