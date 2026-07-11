
import React from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditFormHeaderProps {
  workOrderId: string;
}

export const EditFormHeader: React.FC<EditFormHeaderProps> = ({ workOrderId }) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Work Order: {workOrderId}</h1>
        <p className="text-muted-foreground">Make changes to the work order details below</p>
      </div>
      <div className="flex space-x-4">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => navigate(`/work-orders/${workOrderId}`)}
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
};
