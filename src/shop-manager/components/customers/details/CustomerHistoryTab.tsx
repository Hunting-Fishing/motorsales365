
import React from 'react';
import { Customer } from '@sm/types/customer';
import { CustomerInteraction } from '@sm/types/interaction';
import { Button } from '@sm/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@sm/components/ui/card';
import { Plus, History } from 'lucide-react';
import { Alert, AlertDescription } from '@sm/components/ui/alert';
import { InteractionsList } from '@sm/components/interactions/InteractionsList';

interface CustomerHistoryTabProps {
  customer: Customer;
  interactions: CustomerInteraction[];
  onAddInteraction: () => void;
}

export function CustomerHistoryTab({ 
  customer, 
  interactions, 
  onAddInteraction 
}: CustomerHistoryTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Customer Activity History</h3>
        <Button onClick={onAddInteraction} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Interaction
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-md font-medium flex items-center">
            <History className="h-4 w-4 mr-2" />
            Interactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {interactions && interactions.length > 0 ? (
            <InteractionsList interactions={interactions} />
          ) : (
            <Alert>
              <AlertDescription>
                No interactions have been recorded for this customer yet.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
