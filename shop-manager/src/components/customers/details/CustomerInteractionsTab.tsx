
import React from 'react';
import { Customer } from '@/types/customer';
import { CustomerInteraction } from '@/types/interaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface CustomerInteractionsTabProps {
  customer: Customer;
  interactions: CustomerInteraction[];
  setAddInteractionOpen: (open: boolean) => void;
}

export function CustomerInteractionsTab({ 
  customer, 
  interactions, 
  setAddInteractionOpen 
}: CustomerInteractionsTabProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Customer Interactions</h3>
        <Button onClick={() => setAddInteractionOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Interaction
        </Button>
      </div>

      {interactions.length > 0 ? (
        <div className="space-y-4">
          {interactions.map((interaction) => (
            <Card key={interaction.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {interaction.type || 'General'}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(interaction.created_at || interaction.date)}
                    </Badge>
                    {interaction.status && (
                      <Badge variant={interaction.status === 'completed' ? 'success' : 'secondary'}>
                        {interaction.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line">
                  {interaction.notes || interaction.description}
                </p>
                {interaction.follow_up_date && (
                  <div className="mt-3 text-sm text-gray-600">
                    Follow-up scheduled for: {formatDate(interaction.follow_up_date)}
                  </div>
                )}
                {interaction.staff_member_name && (
                  <div className="mt-2 text-sm text-gray-600">
                    Staff: {interaction.staff_member_name}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Interactions</h3>
            <p className="text-gray-500 text-center mb-6">
              No interactions have been recorded for this customer yet.
            </p>
            <Button onClick={() => setAddInteractionOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Interaction
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
