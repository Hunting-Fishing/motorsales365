
import React from "react";
import { useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditFormActionsProps {
  workOrderId: string;
  isSubmitting: boolean;
}

export const EditFormActions: React.FC<EditFormActionsProps> = ({ 
  workOrderId, 
  isSubmitting 
}) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-end gap-4 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={() => navigate(`/work-orders/${workOrderId}`)}
      >
        Cancel
      </Button>
      <Button 
        type="submit" 
        className="bg-esm-blue-600 hover:bg-esm-blue-700 flex gap-2 items-center"
        disabled={isSubmitting}
      >
        <Save className="h-4 w-4" />
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
};
