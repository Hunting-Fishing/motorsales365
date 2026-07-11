
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkOrderFormHeaderProps {
  isEditing?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
}

export const WorkOrderFormHeader: React.FC<WorkOrderFormHeaderProps> = ({
  isEditing = false,
  isSubmitting = false,
  error = null,
  title,
  description,
}) => {
  return (
    <div className="bg-gradient-to-r from-white via-blue-50/30 to-indigo-50/30 p-8 border-b border-slate-200/60 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
              {title || (isEditing ? "Edit Work Order" : "Create Work Order")}
            </h1>
          </div>
          <p className="text-slate-600 text-lg max-w-2xl">
            {description || (isEditing ? "Update the work order details and track progress" : "Create a new work order to manage and track your service requests")}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                {isEditing ? "Updating..." : "Creating..."}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {isEditing ? "Update Work Order" : "Create Work Order"}
              </span>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6 border-red-200 bg-red-50/80 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-red-800 font-semibold">Error</AlertTitle>
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
