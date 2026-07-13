
import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface FormNavigationProps {
  currentTab: string;
  handlePrevious: () => void;
  handleNext: () => void;
  isSubmitting: boolean;
  isEditMode: boolean;
  formId?: string;
}

export const FormNavigation: React.FC<FormNavigationProps> = ({
  currentTab,
  handlePrevious,
  handleNext,
  isSubmitting,
  isEditMode,
  formId = "customer-create-form"
}) => {
  // Define the final tab where we show the submit button instead of next
  const finalTabs = ["segments"];
  const isFirstTab = currentTab === "personal";
  const isFinalTab = finalTabs.includes(currentTab);
  
  return (
    <div className="flex justify-between mt-6 border-t pt-6">
      <Button
        type="button"
        variant="outline"
        onClick={handlePrevious}
        disabled={isFirstTab || isSubmitting}
        className={`flex items-center ${isFirstTab ? 'invisible' : ''}`}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Previous
      </Button>
      
      {!isFinalTab ? (
        <Button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting}
          className="flex items-center"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      ) : (
        <Button
          type="submit"
          form={formId}
          disabled={isSubmitting}
          className="flex items-center"
        >
          <Save className="h-4 w-4 mr-2" />
          {isEditMode ? "Save Changes" : "Create Customer"}
          {isSubmitting && <span className="ml-2 animate-spin">⏳</span>}
        </Button>
      )}
    </div>
  );
};
