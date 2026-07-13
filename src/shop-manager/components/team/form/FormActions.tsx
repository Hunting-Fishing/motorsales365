
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FormActionsProps {
  isSubmitting: boolean;
  mode: "create" | "edit";
}

export function FormActions({ isSubmitting, mode }: FormActionsProps) {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-end space-x-4">
      <Button 
        variant="outline" 
        onClick={() => navigate("/team")}
        type="button"
      >
        Cancel
      </Button>
      <Button 
        type="submit" 
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          "Saving..."
        ) : mode === "create" ? (
          "Add Team Member"
        ) : (
          "Update Team Member"
        )}
      </Button>
    </div>
  );
}
