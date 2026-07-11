
import React, { useState } from 'react';
import { Customer, CustomerCommunication } from '@/types/customer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Mail, Phone, MessageSquare, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface CustomerCommunicationsTabProps {
  customer: Customer;
  communications: CustomerCommunication[];
  onCommunicationAdded?: () => void;
}

export function CustomerCommunicationsTab({ 
  customer, 
  communications, 
  onCommunicationAdded 
}: CustomerCommunicationsTabProps) {
  const [addCommunicationOpen, setAddCommunicationOpen] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Send className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'outbound' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Communications</h3>
        <Button onClick={() => setAddCommunicationOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Communication
        </Button>
      </div>

      {communications.length > 0 ? (
        <div className="space-y-4">
          {communications.map((communication) => (
            <Card 
              key={communication.id} 
              className={getDirectionColor(communication.direction)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center">
                    {getTypeIcon(communication.type)}
                    <span className="ml-2 capitalize">{communication.type}</span>
                    <Badge variant="outline" className="ml-2">
                      {communication.direction}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(communication.status)}>
                      {communication.status}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatDate(communication.date)}
                    </span>
                  </div>
                </div>
                {communication.subject && (
                  <p className="text-sm font-medium text-gray-700 mt-1">
                    {communication.subject}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line">
                  {communication.content}
                </p>
                {communication.staff_member_name && (
                  <div className="mt-3 text-sm text-gray-600">
                    Staff: {communication.staff_member_name}
                  </div>
                )}
                {communication.template_name && (
                  <div className="mt-1 text-sm text-gray-600">
                    Template: {communication.template_name}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Communications</h3>
            <p className="text-gray-500 text-center mb-6">
              No communications have been recorded for this customer yet.
            </p>
            <Button onClick={() => setAddCommunicationOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Communication
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
