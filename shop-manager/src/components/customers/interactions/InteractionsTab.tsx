import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  User, 
  Calendar, 
  Plus, 
  Search, 
  CheckCircle, 
  Clock,
  AlertTriangle
} from "lucide-react";
import { Customer } from "@/types/customer";
import { CustomerInteraction } from "@/types/interaction";

interface InteractionsTabProps {
  customer: Customer;
  interactions: CustomerInteraction[];
  setAddInteractionOpen: (open: boolean) => void;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'follow_up_required':
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    default:
      return <MessageSquare className="h-4 w-4 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'follow_up_required':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getTypeColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'complaint':
      return 'bg-red-100 text-red-800';
    case 'inquiry':
      return 'bg-blue-100 text-blue-800';
    case 'follow_up':
      return 'bg-purple-100 text-purple-800';
    case 'support':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const InteractionsTab: React.FC<InteractionsTabProps> = ({
  customer,
  interactions,
  setAddInteractionOpen
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredInteractions = React.useMemo(() => {
    return interactions.filter(interaction => {
      const matchesSearch = !searchQuery || 
        interaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (interaction.notes && interaction.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = !typeFilter || typeFilter === 'all' || interaction.type === typeFilter;
      const matchesStatus = !statusFilter || statusFilter === 'all' || interaction.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [interactions, searchQuery, typeFilter, statusFilter]);

  if (interactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <User className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Interactions Yet</h3>
          <p className="text-gray-500 mb-6">
            Record customer interactions to track communication history and follow-ups.
          </p>
          <Button onClick={() => setAddInteractionOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Interaction
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-medium">Interactions ({interactions.length})</h3>
        <Button onClick={() => setAddInteractionOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Interaction
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search interactions..."
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
            <SelectItem value="inquiry">Inquiry</SelectItem>
            <SelectItem value="complaint">Complaint</SelectItem>
            <SelectItem value="follow_up">Follow-up</SelectItem>
            <SelectItem value="support">Support</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="follow_up_required">Follow-up Required</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interactions List */}
      <div className="space-y-4">
        {filteredInteractions.map((interaction) => (
          <Card key={interaction.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    {getStatusIcon(interaction.status)}
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {interaction.description}
                    </CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>by {interaction.staff_member_name}</span>
                      <span>•</span>
                      <span>{new Date(interaction.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Badge variant="outline" className={getStatusColor(interaction.status)}>
                    {interaction.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline" className={getTypeColor(interaction.type)}>
                    {interaction.type}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {interaction.notes && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                  {interaction.notes}
                </p>
              )}
              
              {interaction.follow_up_date && !interaction.follow_up_completed && (
                <div className="flex items-center space-x-2 text-sm text-orange-700 bg-orange-50 rounded-md p-2">
                  <Calendar className="h-4 w-4" />
                  <span>Follow-up scheduled for {new Date(interaction.follow_up_date).toLocaleDateString()}</span>
                </div>
              )}
              
              {interaction.related_work_order_id && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-xs text-gray-500">
                    Related to Work Order #{interaction.related_work_order_id}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};