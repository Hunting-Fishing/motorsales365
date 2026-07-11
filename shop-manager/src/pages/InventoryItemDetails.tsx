import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { InventoryItemDetails } from '@/components/inventory/InventoryItemDetails';
import { useInventoryItem } from '@/hooks/inventory/useInventoryItem';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function InventoryItemDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get('edit') === 'true';
  const { item, isLoading, error, updateItem, isUpdating } = useInventoryItem(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span className="text-lg font-medium">Error loading item</span>
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          onClick={() => navigate('/inventory')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="flex items-center space-x-2 text-gray-600">
          <AlertCircle className="h-5 w-5" />
          <span className="text-lg font-medium">Item not found</span>
        </div>
        <p className="text-sm text-muted-foreground">
          The inventory item you're looking for doesn't exist or has been removed.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/inventory')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <InventoryItemDetails
        item={item}
        onUpdate={updateItem}
        isUpdating={isUpdating}
        initialEditMode={editMode}
      />
    </div>
  );
}