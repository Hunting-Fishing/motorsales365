
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AffiliateTool, AffiliateProduct } from "@/types/affiliate";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, ExternalLink, AlertTriangle, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProductPriceHistory } from "@/hooks/useProductPriceHistory";

interface PriceHistoryEntry {
  date: string;
  price: number;
  salePrice?: number;
}

interface ProductDetailEditorProps {
  product: AffiliateTool | AffiliateProduct;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProduct: AffiliateTool | AffiliateProduct) => Promise<void>;
}

const ProductDetailEditor = ({ product, isOpen, onClose, onSave }: ProductDetailEditorProps) => {
  const [editedProduct, setEditedProduct] = useState<AffiliateTool | AffiliateProduct>({...product});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  // Use live price history data from the database
  const { priceHistory, loading: priceHistoryLoading } = useProductPriceHistory((product as any).id || '');
  
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedProduct(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate affiliate link
      const affiliateLink = (editedProduct as any).affiliateLink || (editedProduct as any).affiliateUrl;
      if (!isValidUrl(affiliateLink)) {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid affiliate URL",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }
      
      await onSave(editedProduct);
      toast({
        title: "Success",
        description: "Product updated successfully",
        variant: "success"
      });
      onClose();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const checkLink = () => {
    const url = (editedProduct as any).affiliateLink || (editedProduct as any).affiliateUrl;
    if (isValidUrl(url)) {
      window.open(url, '_blank');
    } else {
      toast({
        title: "Invalid URL",
        description: "The affiliate link is not a valid URL",
        variant: "destructive"
      });
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Edit Product
            {isValidUrl((editedProduct as any).affiliateLink || (editedProduct as any).affiliateUrl) ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="history">Price History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={(editedProduct as any).name} 
                  onChange={handleChange} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={(editedProduct as any).description} 
                  onChange={handleChange} 
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="affiliateLink">Affiliate Link</Label>
                <div className="flex gap-2">
                  <Input 
                    id="affiliateLink" 
                    name={(editedProduct as any).affiliateLink !== undefined ? "affiliateLink" : "affiliateUrl"}
                    value={(editedProduct as any).affiliateLink || (editedProduct as any).affiliateUrl} 
                    onChange={handleChange} 
                    className={!isValidUrl((editedProduct as any).affiliateLink || (editedProduct as any).affiliateUrl) ? "border-red-500" : ""}
                  />
                  <Button 
                    variant="outline" 
                    onClick={checkLink}
                    disabled={!isValidUrl((editedProduct as any).affiliateLink || (editedProduct as any).affiliateUrl)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                </div>
                {!isValidUrl((editedProduct as any).affiliateLink || (editedProduct as any).affiliateUrl) && (
                  <p className="text-red-500 text-sm mt-1">Please enter a valid URL</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input 
                  id="category" 
                  name="category" 
                  value={(editedProduct as any).category} 
                  onChange={handleChange} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input 
                  id="manufacturer" 
                  name="manufacturer" 
                  value={(editedProduct as any).manufacturer} 
                  onChange={handleChange} 
                />
              </div>
              
              {(editedProduct as any).imageUrl !== undefined && (
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input 
                    id="imageUrl" 
                    name="imageUrl" 
                    value={(editedProduct as any).imageUrl} 
                    onChange={handleChange} 
                  />
                  {(editedProduct as any).imageUrl && (
                    <div className="mt-2 border rounded-md p-2 max-w-xs">
                      <img 
                        src={(editedProduct as any).imageUrl} 
                        alt="Product" 
                        className="max-h-40 object-contain mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://placehold.co/300x300?text=Image+Error";
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="pricing" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  {(editedProduct as any).price !== undefined ? "Price" : "Retail Price"}
                </Label>
                <Input 
                  id="price" 
                  name={(editedProduct as any).price !== undefined ? "price" : "retailPrice"}
                  type="number" 
                  min="0" 
                  step="0.01" 
                  value={(editedProduct as any).price || (editedProduct as any).retailPrice || 0} 
                  onChange={handleChange} 
                />
              </div>
              
              {(editedProduct as any).salePrice !== undefined && (
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Sale Price</Label>
                  <Input 
                    id="salePrice" 
                    name="salePrice" 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={(editedProduct as any).salePrice || ""} 
                    onChange={handleChange} 
                  />
                </div>
              )}
              
              {(editedProduct as any).discount !== undefined && (
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input 
                    id="discount" 
                    name="discount" 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="1" 
                    value={(editedProduct as any).discount || 0} 
                    onChange={handleChange} 
                  />
                </div>
              )}
            </div>
            
            <div className="pt-4">
              <h4 className="font-medium mb-2">Flags</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(editedProduct as any).featured !== undefined && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="featured"
                      name="featured"
                      checked={(editedProduct as any).featured}
                      onChange={(e) => setEditedProduct(prev => ({
                        ...prev,
                        featured: e.target.checked
                      }))}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="featured">Featured</Label>
                  </div>
                )}
                
                {(editedProduct as any).bestSeller !== undefined && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="bestSeller"
                      name="bestSeller"
                      checked={(editedProduct as any).bestSeller}
                      onChange={(e) => setEditedProduct(prev => ({
                        ...prev,
                        bestSeller: e.target.checked
                      }))}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="bestSeller">Best Seller</Label>
                  </div>
                )}
                
                {(editedProduct as any).freeShipping !== undefined && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="freeShipping"
                      name="freeShipping"
                      checked={(editedProduct as any).freeShipping}
                      onChange={(e) => setEditedProduct(prev => ({
                        ...prev,
                        freeShipping: e.target.checked
                      }))}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="freeShipping">Free Shipping</Label>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Date</TableHead>
                    <TableHead>Regular Price</TableHead>
                    <TableHead>Sale Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistoryLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">Loading price history...</TableCell>
                    </TableRow>
                  ) : priceHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">No price history available</TableCell>
                    </TableRow>
                  ) : (
                    priceHistory.map((entry, index) => (
                      <TableRow key={entry.id || index}>
                        <TableCell className="font-medium">{formatDate(entry.date)}</TableCell>
                        <TableCell>${entry.price.toFixed(2)}</TableCell>
                        <TableCell>
                          {entry.salePrice ? `$${entry.salePrice.toFixed(2)}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-center items-center mt-6 text-sm text-muted-foreground">
              <History className="h-4 w-4 mr-2" />
              Price history data is tracked automatically when prices change
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailEditor;
