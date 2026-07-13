import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import { InventoryItemExtended } from '@/types/inventory';
import { WebLinksDisplay } from './WebLinksDisplay';

interface InventoryItemDetailsProps {
  item: InventoryItemExtended;
  onUpdate: (updates: Partial<InventoryItemExtended>) => void;
  isUpdating?: boolean;
  initialEditMode?: boolean;
}

export function InventoryItemDetails({ item, onUpdate, isUpdating, initialEditMode = false }: InventoryItemDetailsProps) {
  const navigate = useNavigate();

  const handleEdit = () => {
    // Navigate to edit page with comprehensive form
    navigate(`/inventory/edit/${item.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in stock':
        return 'bg-green-100 text-green-800';
      case 'low stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out of stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalValue = (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/inventory')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{item.name}</h1>
            <p className="text-muted-foreground">SKU: {item.sku}</p>
          </div>
        </div>
        <Button onClick={handleEdit} size="sm">
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Item
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <p className="text-sm font-medium mt-1">{item.name}</p>
              </div>
              <div>
                <Label>SKU</Label>
                <p className="text-sm font-medium mt-1">{item.sku}</p>
              </div>
              <div>
                <Label>Category</Label>
                <p className="text-sm font-medium mt-1">{item.category}</p>
              </div>
              <div>
                <Label>Supplier</Label>
                <p className="text-sm font-medium mt-1">{item.supplier || 'N/A'}</p>
              </div>
              <div>
                <Label>Location</Label>
                <p className="text-sm font-medium mt-1">{item.location || 'N/A'}</p>
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-1">
                  <Badge className={getStatusColor(item.status)}>
                    {item.status}
                  </Badge>
                </div>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <p className="text-sm mt-1">{item.description || 'No description available'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Stock & Pricing */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Stock</Label>
                <p className="text-2xl font-bold text-primary">{item.quantity}</p>
              </div>
              <div>
                <Label>Reorder Point</Label>
                <p className="text-sm font-medium mt-1">{item.reorder_point || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Unit Price</Label>
                <p className="text-lg font-semibold">{formatCurrency(item.unit_price)}</p>
              </div>
              <div>
                <Label>Total Value</Label>
                <p className="text-lg font-semibold text-primary">{formatCurrency(totalValue)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Web Links Section */}
          <WebLinksDisplay webLinks={(item as any).webLinks} />
        </div>
      </div>
    </div>
  );
}