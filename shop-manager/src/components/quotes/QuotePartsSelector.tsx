import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Package, Search } from 'lucide-react';
import { QuoteItemFormValues, QUOTE_ITEM_TYPES } from '@/types/quote';
import { formatCurrency } from '@/utils/formatters';
import { useInventoryItems } from '@/hooks/inventory/useInventoryItems';

interface QuotePartsSelectorProps {
  selectedParts: QuoteItemFormValues[];
  onPartsChange: (parts: QuoteItemFormValues[]) => void;
}

export function QuotePartsSelector({ selectedParts, onPartsChange }: QuotePartsSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInventoryBrowser, setShowInventoryBrowser] = useState(false);
  const { items: inventoryItems, loading: inventoryLoading } = useInventoryItems();

  const filteredInventory = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addCustomPart = () => {
    const newPart: QuoteItemFormValues = {
      name: '',
      description: '',
      category: '',
      quantity: 1,
      unit_price: 0,
      item_type: 'part'
    };
    onPartsChange([...selectedParts, newPart]);
  };

  const addInventoryPart = (inventoryItem: any) => {
    const newPart: QuoteItemFormValues = {
      name: inventoryItem.name,
      description: inventoryItem.description || '',
      category: inventoryItem.category || '',
      quantity: 1,
      unit_price: inventoryItem.price || 0,
      item_type: 'part'
    };
    onPartsChange([...selectedParts, newPart]);
    setShowInventoryBrowser(false);
    setSearchTerm('');
  };

  const removePart = (index: number) => {
    const updatedParts = selectedParts.filter((_, i) => i !== index);
    onPartsChange(updatedParts);
  };

  const updatePart = (index: number, field: keyof QuoteItemFormValues, value: any) => {
    const updatedParts = [...selectedParts];
    updatedParts[index] = {
      ...updatedParts[index],
      [field]: value
    };
    onPartsChange(updatedParts);
  };

  return (
    <div className="space-y-6">
      {/* Part Addition Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add Parts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={addCustomPart} variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Custom Part
            </Button>
            <Button 
              onClick={() => setShowInventoryBrowser(!showInventoryBrowser)} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Browse Inventory
            </Button>
          </div>

          {/* Inventory Browser */}
          {showInventoryBrowser && (
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle className="text-lg">Inventory Browser</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search inventory by name, SKU, or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {inventoryLoading ? (
                  <div className="text-center py-4">Loading inventory...</div>
                ) : filteredInventory.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {searchTerm ? 'No items match your search' : 'No inventory items found'}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredInventory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => addInventoryPart(item)}
                      >
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.sku && `SKU: ${item.sku} • `}
                            {item.category && `Category: ${item.category} • `}
                            Qty: {item.quantity}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(item.price || 0)}</div>
                          <Button size="sm" variant="ghost">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Selected Parts List */}
      {selectedParts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Selected Parts ({selectedParts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedParts.map((part, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Part {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePart(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Part Name *</Label>
                    <Input
                      placeholder="Part name"
                      value={part.name}
                      onChange={(e) => updatePart(index, 'name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      onValueChange={(value) => updatePart(index, 'item_type', value)}
                      value={part.item_type}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUOTE_ITEM_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      placeholder="Part category"
                      value={part.category || ''}
                      onChange={(e) => updatePart(index, 'category', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={part.quantity}
                      onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unit Price *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={part.unit_price}
                      onChange={(e) => updatePart(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total</Label>
                    <div className="p-2 bg-muted rounded-md">
                      {formatCurrency(part.quantity * part.unit_price)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Detailed description of the part..."
                    value={part.description || ''}
                    onChange={(e) => updatePart(index, 'description', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedParts.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No parts added yet</h3>
              <p className="text-muted-foreground mb-6">
                Add parts to your quote by clicking the buttons above.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}