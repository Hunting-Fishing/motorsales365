
import React from "react";
import { Button } from "@/components/ui/button";
import { Save, X, Sparkles } from "lucide-react";

interface FormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
}

export const FormActions: React.FC<FormActionsProps> = ({ isSubmitting, onCancel }) => {
  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100/80 border-t border-slate-200 p-6 rounded-b-xl">
      <div className="flex space-x-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-3 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        
        <Button 
          type="submit" 
          disabled={isSubmitting}
          size="lg"
          className="px-8 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Creating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Create Work Order
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};
