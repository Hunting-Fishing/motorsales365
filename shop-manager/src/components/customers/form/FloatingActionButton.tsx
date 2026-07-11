
import React from "react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface FloatingActionButtonProps {
  isSubmitting: boolean;
  isEditMode?: boolean;
  onClick: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  isSubmitting,
  isEditMode = false,
  onClick
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        type="button"
        onClick={onClick}
        disabled={isSubmitting}
        className="shadow-lg flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90"
        size="lg"
      >
        <Save className="h-5 w-5" />
        {isSubmitting 
          ? (isEditMode ? "Updating..." : "Creating...") 
          : (isEditMode ? "Update Customer" : "Create Customer")}
      </Button>
    </div>
  );
};
