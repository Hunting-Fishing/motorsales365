
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Customer, CustomerCommunication } from "@/types/customer";
import { Plus, Search, Mail, MessageCircle, Phone, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AddCommunicationDialog } from "./AddCommunicationDialog";

interface CommunicationHistoryProps {
  customer: Customer;
  communications: CustomerCommunication[];
  onCommunicationAdded: (communication: CustomerCommunication) => void;
}

export const CommunicationHistory: React.FC<CommunicationHistoryProps> = ({
  customer,
  communications,
  onCommunicationAdded
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [directionFilter, setDirectionFilter] = useState<string>("");
  const [isAddCommunicationOpen, setIsAddCommunicationOpen] = useState(false);

  // Filter communications based on search query, type, and direction
  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = searchQuery === "" || 
      comm.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (comm.subject && comm.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === "" || typeFilter === "all" || comm.type === typeFilter;
    const matchesDirection = directionFilter === "" || directionFilter === "all" || comm.direction === directionFilter;
    
    return matchesSearch && matchesType && matchesDirection;
  });

  // Sort communications by date (newest first)
  const sortedCommunications = [...filteredCommunications].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'text':
        return <MessageCircle className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'in-person':
        return <User className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getTypeClass = (type: string) => {
    switch(type) {
      case 'email':
        return "bg-blue-100 text-blue-800";
      case 'text':
        return "bg-green-100 text-green-800";
      case 'phone':
        return "bg-purple-100 text-purple-800";
      case 'in-person':
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getDirectionBadge = (direction: string) => {
    return direction === 'incoming' ? (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        Incoming
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        Outgoing
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Communication History</CardTitle>
        <Button size="sm" onClick={() => setIsAddCommunicationOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Record Communication
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search communications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="in-person">In-person</SelectItem>
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All directions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All directions</SelectItem>
                <SelectItem value="incoming">Incoming</SelectItem>
                <SelectItem value="outgoing">Outgoing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sortedCommunications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {communications.length === 0 ? (
                <>No communications recorded yet for this customer.</>
              ) : (
                <>No communications match your filters.</>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCommunications.map((communication) => (
                <div 
                  key={communication.id} 
                  className="border rounded-lg p-4 relative hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full p-2 ${getTypeClass(communication.type)}`}>
                        {getTypeIcon(communication.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium capitalize">{communication.type}</span>
                          {getDirectionBadge(communication.direction)}
                          <span className="text-muted-foreground text-xs">
                            {format(parseISO(communication.date), "PPP p")}
                          </span>
                        </div>
                        
                        {communication.subject && (
                          <p className="font-medium text-sm">{communication.subject}</p>
                        )}
                        
                        <p className="text-sm text-slate-600 whitespace-pre-wrap mt-1">
                          {communication.content}
                        </p>
                        
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-muted-foreground">
                            By {communication.staff_member_name}
                          </p>
                          
                          {communication.template_name && (
                            <Badge variant="outline" className="text-xs">
                              Template: {communication.template_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <AddCommunicationDialog
          customer={customer}
          open={isAddCommunicationOpen}
          onOpenChange={setIsAddCommunicationOpen}
          onCommunicationAdded={onCommunicationAdded}
        />
      </CardContent>
    </Card>
  );
};
