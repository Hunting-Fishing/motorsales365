
import { useNavigate, useLocation } from "react-router-dom";
import { ComprehensiveInventoryForm } from "@/components/inventory/form/ComprehensiveInventoryForm";
import { useInventoryCrud } from "@/hooks/inventory/useInventoryCrud";
import { InventoryItemExtended } from "@/types/inventory";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InventoryAdd() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem, isLoading } = useInventoryCrud();
  
  // Get pre-filled data from invoice scanner
  const extractedData = location.state?.extractedData;

  const handleSubmit = async (formData: Omit<InventoryItemExtended, "id">) => {
    try {
      await addItem(formData);
      toast({
        variant: "default",
        title: "Success",
        description: `${formData.name} has been added to inventory`,
        className: "border-green-200 bg-green-50 text-green-800"
      });
      navigate("/inventory");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add inventory item"
      });
      console.error("Error creating inventory item:", error);
    }
  };

  const handleCancel = () => {
    navigate("/inventory");
  };

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
              Back to Inventory
            </Button>
            <div className="text-slate-400">/</div>
            <span className="text-slate-600 font-medium">Add New Item</span>
          </div>
        </div>
      </div>

      <ComprehensiveInventoryForm 
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onCancel={handleCancel}
        initialData={extractedData}
      />
    </div>
  );
}
