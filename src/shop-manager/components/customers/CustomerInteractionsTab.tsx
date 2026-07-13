
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CustomerInteraction } from "@/types/interaction";
import { InteractionsList } from "@/components/interactions/InteractionsList";

interface CustomerInteractionsTabProps {
  customerInteractions: CustomerInteraction[];
  setAddInteractionOpen: (open: boolean) => void;
}

export const CustomerInteractionsTab: React.FC<CustomerInteractionsTabProps> = ({
  customerInteractions,
  setAddInteractionOpen
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Interaction History</h2>
        <Button onClick={() => setAddInteractionOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Record Interaction
        </Button>
      </div>
      <InteractionsList 
        interactions={customerInteractions} 
        showFilters={true}
      />
    </div>
  );
};
