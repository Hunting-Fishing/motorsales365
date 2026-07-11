import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MessageSquare, User, Plus, Search, Calendar } from "lucide-react";
import { Customer } from "@/types/customer";
import { CustomerCommunication } from "@/types/customer/notes";
import { AddCommunicationDialog } from "./AddCommunicationDialog";

interface CommunicationsTabProps {
  customer: Customer;
  communications: CustomerCommunication[];
  onCommunicationAdded: (communication: CustomerCommunication) => void;
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'phone':
      return <Phone className="h-4 w-4" />;
    case 'text':
      return <MessageSquare className="h-4 w-4" />;
    case 'in-person':
      return <User className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

const getDirectionColor = (direction: string) => {
  switch (direction) {
    case 'incoming':
    case 'inbound':
      return 'bg-green-100 text-green-800';
    case 'outgoing':
    case 'outbound':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const CommunicationsTab: React.FC<CommunicationsTabProps> = ({
  customer,
  communications,
  onCommunicationAdded
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');

  const filteredCommunications = React.useMemo(() => {
    return communications.filter(comm => {
      const matchesSearch = !searchQuery || 
        comm.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (comm.subject && comm.subject.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = !typeFilter || typeFilter === "all" || comm.type === typeFilter;
      const matchesDirection = !directionFilter || directionFilter === "all" || comm.direction === directionFilter;
      
      return matchesSearch && matchesType && matchesDirection;
    });
  }, [communications, searchQuery, typeFilter, directionFilter]);

  if (communications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Communications Yet</h3>
          <p className="text-gray-500 mb-6">
            Start building a communication history with this customer.
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Communication
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-medium">Communications ({communications.length})</h3>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Communication
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search communications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="in-person">In-person</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Directions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="incoming">Incoming</SelectItem>
            <SelectItem value="outgoing">Outgoing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Communications List */}
      <div className="space-y-4">
        {filteredCommunications.map((communication) => (
          <Card key={communication.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    {getIconForType(communication.type)}
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {communication.subject || `${communication.type} communication`}
                    </CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>by {communication.staff_member_name}</span>
                      <span>•</span>
                      <span>{new Date(communication.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Badge variant="outline" className={getDirectionColor(communication.direction)}>
                    {communication.direction}
                  </Badge>
                  <Badge variant="outline">
                    {communication.type}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {communication.content}
              </p>
              {communication.template_name && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-xs text-gray-500">
                    Used template: {communication.template_name}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AddCommunicationDialog
        customer={customer}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onCommunicationAdded={onCommunicationAdded}
      />
    </div>
  );
};