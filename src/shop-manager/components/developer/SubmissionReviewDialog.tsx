import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Check, X, Loader2, AlertCircle, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Submission {
  id: string;
  product_name: string;
  product_url: string;
  suggested_category: string;
  notes: string | null;
  status: string;
  submitted_at: string;
  suggested_by: string | null;
  module_id: string;
}

interface SubmissionReviewDialogProps {
  submission: Submission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleSlug: string;
}

interface FieldErrors {
  description?: string;
  imageUrl?: string;
}

export function SubmissionReviewDialog({
  submission,
  open,
  onOpenChange,
  moduleSlug,
}: SubmissionReviewDialogProps) {
  const queryClient = useQueryClient();
  const [productDescription, setProductDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [showDenyReason, setShowDenyReason] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [isDenying, setIsDenying] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);

  const resetForm = () => {
    setProductDescription('');
    setImageUrl('');
    setProductPrice('');
    setShowDenyReason(false);
    setDenyReason('');
    setDuplicateWarning(null);
    setApprovalError(null);
    setFieldErrors({});
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Check for duplicate links when dialog opens
  React.useEffect(() => {
    const checkDuplicate = async () => {
      if (!submission?.product_url) return;
      
      const { data: existingProducts } = await supabase
        .from('products')
        .select('id, title, affiliate_link')
        .eq('affiliate_link', submission.product_url);
      
      if (existingProducts && existingProducts.length > 0) {
        setDuplicateWarning(`This link already exists as "${existingProducts[0].title}"`);
      } else {
        setDuplicateWarning(null);
      }
    };
    
    if (open && submission) {
      checkDuplicate();
    }
  }, [open, submission]);

  const handleApprove = async () => {
    if (!submission) return;
    
    // Reset errors
    setApprovalError(null);
    setFieldErrors({});
    
    // Validate required fields
    const newFieldErrors: FieldErrors = {};
    if (!productDescription.trim()) {
      newFieldErrors.description = 'Product description is required';
    }
    if (!imageUrl.trim()) {
      newFieldErrors.imageUrl = 'Product image URL is required';
    }
    
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setApprovalError('Please fill in all required fields');
      return;
    }

    // Check for duplicate before approval
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id')
      .eq('affiliate_link', submission.product_url);
    
    if (existingProducts && existingProducts.length > 0) {
      setApprovalError('This product link already exists in the store');
      return;
    }

    setIsApproving(true);
    try {
      // First, we need a category_id - use case-insensitive lookup
      let categoryId: string | null = null;
      const categoryName = submission.suggested_category || 'General';
      const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '-');
      
      // Try case-insensitive name match first
      const { data: existingCategories, error: catError } = await supabase
        .from('product_categories')
        .select('id')
        .ilike('name', categoryName)
        .limit(1);
      
      if (catError) throw catError;
      
      if (existingCategories && existingCategories.length > 0) {
        categoryId = existingCategories[0].id;
      } else {
        // Try slug lookup as fallback
        const { data: bySlug, error: slugError } = await supabase
          .from('product_categories')
          .select('id')
          .eq('slug', categorySlug)
          .limit(1);
        
        if (slugError) throw slugError;
        
        if (bySlug && bySlug.length > 0) {
          categoryId = bySlug[0].id;
        } else {
          // Create a new category only if it truly doesn't exist
          const { data: newCategory, error: newCatError } = await supabase
            .from('product_categories')
            .insert({
              name: categoryName,
              slug: categorySlug,
            })
            .select('id')
            .single();
          
          if (newCatError) {
            // If unique constraint error, try fetching the existing one
            if (newCatError.code === '23505') {
              const { data: refetchCat } = await supabase
                .from('product_categories')
                .select('id')
                .eq('slug', categorySlug)
                .single();
              
              if (refetchCat) {
                categoryId = refetchCat.id;
              } else {
                throw new Error('Failed to resolve category');
              }
            } else {
              throw newCatError;
            }
          } else {
            categoryId = newCategory.id;
          }
        }
      }

      // Create product with price
      const priceValue = productPrice ? parseFloat(productPrice) : null;
      
      const { error: productError } = await supabase
        .from('products')
        .insert({
          title: submission.product_name,
          name: submission.product_name,
          description: productDescription,
          image_url: imageUrl,
          affiliate_link: submission.product_url,
          module_id: submission.module_id,
          category_id: categoryId,
          product_type: 'affiliate',
          is_approved: true,
          is_available: true,
          suggested_by: submission.suggested_by,
          suggestion_reason: submission.notes,
          price: priceValue,
        });

      if (productError) throw productError;

      // Update submission status
      const { error: updateError } = await supabase
        .from('product_submissions')
        .update({ status: 'approved' })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      toast.success('Product approved and added to store!');
      queryClient.invalidateQueries({ queryKey: ['product-submissions', moduleSlug] });
      queryClient.invalidateQueries({ queryKey: ['module-products', moduleSlug] });
      handleClose();
    } catch (error: any) {
      console.error('Error approving submission:', error);
      
      // Set persistent error message in dialog
      let errorMessage = error.message || 'An unexpected error occurred';
      if (error.code === '23505') {
        if (error.message?.includes('product_categories')) {
          errorMessage = 'Category conflict - please try again or contact support';
        } else if (error.message?.includes('affiliate_link')) {
          errorMessage = 'This product link already exists in the store';
        }
      }
      
      setApprovalError(errorMessage);
      toast.error(`Failed to approve: ${errorMessage}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeny = async () => {
    if (!submission) return;
    
    if (!denyReason.trim()) {
      toast.error('Please provide a reason for denial');
      return;
    }

    setIsDenying(true);
    try {
      const { error } = await supabase
        .from('product_submissions')
        .update({ 
          status: 'rejected',
          notes: `[REJECTED] ${denyReason}${submission.notes ? `\n\nOriginal notes: ${submission.notes}` : ''}`
        })
        .eq('id', submission.id);

      if (error) throw error;

      toast.success('Submission denied');
      queryClient.invalidateQueries({ queryKey: ['product-submissions', moduleSlug] });
      handleClose();
    } catch (error: any) {
      console.error('Error denying submission:', error);
      toast.error(`Failed to deny: ${error.message}`);
    } finally {
      setIsDenying(false);
    }
  };

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Review Submission
            <Badge 
              variant={
                submission.status === 'pending' ? 'secondary' :
                submission.status === 'approved' ? 'default' : 'destructive'
              }
            >
              {submission.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Review this product suggestion and approve or deny it
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Submission Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Product Name</Label>
              <p className="font-medium">{submission.product_name}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Category</Label>
              <p className="font-medium">{submission.suggested_category || 'Uncategorized'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Product URL</Label>
            <div className="flex items-center gap-2">
              <a 
                href={submission.product_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 text-sm break-all"
              >
                {submission.product_url}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Open this link to copy the product image and write a description
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              disabled={isFetchingMeta || !submission.product_url}
              onClick={async () => {
                setIsFetchingMeta(true);
                try {
                  const { data, error } = await supabase.functions.invoke('fetch-product-meta', {
                    body: { url: submission.product_url },
                  });
                  if (error) throw error;
                  if (data?.success && data.data) {
                    const meta = data.data;
                    if (meta.description && !productDescription) setProductDescription(meta.description);
                    if (meta.imageUrl && !imageUrl) setImageUrl(meta.imageUrl);
                    if (meta.price && !productPrice) setProductPrice(String(meta.price));
                    toast.success('Product info fetched! Review and edit as needed.');
                  } else {
                    toast.error(data?.error || 'Could not extract metadata from this URL');
                  }
                } catch (err: any) {
                  console.error('Auto-fill error:', err);
                  toast.error('Failed to fetch product info');
                } finally {
                  setIsFetchingMeta(false);
                }
              }}
            >
              {isFetchingMeta ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3 mr-1" />
                  Auto-Fill from URL
                </>
              )}
            </Button>
            {duplicateWarning && (
              <div className="mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded-md">
                <p className="text-sm text-destructive font-medium">⚠️ Duplicate Link Detected</p>
                <p className="text-xs text-destructive/80">{duplicateWarning}</p>
              </div>
            )}
          </div>

          {submission.notes && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">User Notes</Label>
              <p className="text-sm bg-muted/50 p-3 rounded-md">{submission.notes}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Submitted</Label>
            <p className="text-sm">
              {new Date(submission.submitted_at).toLocaleDateString()} at{' '}
              {new Date(submission.submitted_at).toLocaleTimeString()}
            </p>
          </div>

          {submission.status === 'pending' && (
            <>
              {/* Error Alert */}
              {approvalError && (
                <div className="p-4 bg-destructive/10 border-2 border-destructive rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">Approval Failed</p>
                      <p className="text-sm text-destructive/90">{approvalError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Product Details (Required for Approval)</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className={fieldErrors.description ? 'text-destructive' : ''}>
                    Product Description *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Enter a compelling description for this product..."
                    value={productDescription}
                    onChange={(e) => {
                      setProductDescription(e.target.value);
                      setApprovalError(null);
                      setFieldErrors(prev => ({ ...prev, description: undefined }));
                    }}
                    rows={3}
                    className={fieldErrors.description ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {fieldErrors.description && (
                    <p className="text-sm text-destructive">{fieldErrors.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className={fieldErrors.imageUrl ? 'text-destructive' : ''}>
                    Product Image URL *
                  </Label>
                  <Input
                    id="imageUrl"
                    placeholder="https://example.com/product-image.jpg"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setApprovalError(null);
                      setFieldErrors(prev => ({ ...prev, imageUrl: undefined }));
                    }}
                    className={fieldErrors.imageUrl ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {fieldErrors.imageUrl && (
                    <p className="text-sm text-destructive">{fieldErrors.imageUrl}</p>
                  )}
                  {imageUrl && !fieldErrors.imageUrl && (
                    <div className="mt-2">
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="w-24 h-24 object-cover rounded-md border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Product Price (optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the product price to display in the store
                  </p>
                </div>
              </div>

              {showDenyReason && (
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="denyReason">Reason for Denial *</Label>
                  <Textarea
                    id="denyReason"
                    placeholder="Explain why this submission is being denied..."
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {submission.status === 'pending' ? (
            <>
              {showDenyReason ? (
                <>
                  <Button variant="ghost" onClick={() => setShowDenyReason(false)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeny}
                    disabled={isDenying}
                  >
                    {isDenying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Denying...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Confirm Deny
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDenyReason(true)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Deny
                  </Button>
                  <Button 
                    onClick={handleApprove}
                    disabled={isApproving || !productDescription.trim() || !imageUrl.trim()}
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Approve & Add to Store
                      </>
                    )}
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
