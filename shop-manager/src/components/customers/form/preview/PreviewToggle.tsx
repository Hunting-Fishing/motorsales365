import React from "react";
import { CustomerFormValues } from "../schemas/customerSchema";
import { CustomerPreview } from "./CustomerPreview";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface PreviewToggleProps {
  formData: CustomerFormValues;
  isSubmitting?: boolean;
  isEditMode?: boolean;
  onSave?: () => void;
}

export const PreviewToggle: React.FC<PreviewToggleProps> = ({ 
  formData, 
  isSubmitting = false,
  isEditMode = false,
  onSave
}) => {
  const [showPreview, setShowPreview] = React.useState(false);
  
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          {isEditMode && onSave && (
            <Button
              type="button"
              onClick={onSave}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Updating..." : "Update Customer"}
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          {showPreview ? "Hide Preview" : "Show Preview"}
        </button>
      </div>

      {showPreview && (
        <div className="mb-6">
          <CustomerPreview customerData={formData} />
        </div>
      )}
    </>
  );
};
