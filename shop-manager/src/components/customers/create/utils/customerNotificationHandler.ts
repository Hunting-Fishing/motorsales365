
import { useToast } from "@/hooks/use-toast";

/**
 * Handles success notifications for customer creation
 */
export const showSuccessNotification = (
  toast: ReturnType<typeof useToast>["toast"],
  firstName: string,
  lastName: string
) => {
  toast({
    title: "Customer Created Successfully",
    description: `${firstName} ${lastName} has been added to your customers.`,
    variant: "default",
  });
};

/**
 * Handles warning notifications for specific scenarios
 */
export const showWarningNotification = (
  toast: ReturnType<typeof useToast>["toast"], 
  type: "note" | "household" | "segment",
) => {
  const warnings = {
    note: {
      title: "Note Saving Warning",
      description: "Customer created but initial notes could not be saved. You can add them later.",
    },
    household: {
      title: "Household Assignment Warning",
      description: "Customer created but could not be added to household. Please check household settings.",
    },
    segment: {
      title: "Segment Assignment Warning",
      description: "Customer created but segments could not be assigned. Please check segment settings.",
    }
  };

  const warning = warnings[type];
  
  toast({
    title: warning.title,
    description: warning.description,
    variant: "destructive",
  });
};

/**
 * Handles import completion notification
 */
export const showImportCompleteNotification = (
  toast: ReturnType<typeof useToast>["toast"]
) => {
  toast({
    title: "Import Complete",
    description: "Navigate to the Customers page to see imported customers.",
    variant: "default",
  });
};
