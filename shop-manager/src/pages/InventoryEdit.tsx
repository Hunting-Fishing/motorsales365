import { useNavigate, useParams } from "react-router-dom";
import { ComprehensiveInventoryForm } from "@/components/inventory/form/ComprehensiveInventoryForm";
import { useInventoryCrud } from "@/hooks/inventory/useInventoryCrud";
import { useInventoryItem } from "@/hooks/inventory/useInventoryItem";
import { InventoryItemExtended } from "@/types/inventory";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function InventoryEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { updateItem, isLoading: isUpdating } = useInventoryCrud();
  const { item, isLoading } = useInventoryItem(id!);

  const handleSubmit = async (formData: Omit<InventoryItemExtended, "id">) => {
    try {
      await updateItem(id!, formData);
      toast({
        variant: "default",
        title: "Success",
        description: `${formData.name} has been updated`,
        className: "border-green-200 bg-green-50 text-green-800"
      });
      navigate(`/inventory/item/${id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update inventory item"
      });
      console.error("Error updating inventory item:", error);
    }
  };

  const handleCancel = () => {
    navigate(`/inventory/item/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Item not found</p>
          <Button onClick={() => navigate("/inventory")} className="mt-4">
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header with breadcrumb */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Item
            </Button>
            <div className="text-slate-400">/</div>
            <span className="text-slate-600 font-medium">Edit {item.name}</span>
          </div>
        </div>
      </div>

      <ComprehensiveInventoryForm 
        onSubmit={handleSubmit}
        isLoading={isUpdating}
        onCancel={handleCancel}
        initialData={item}
        isEditMode={true}
      />
    </div>
  );
}
