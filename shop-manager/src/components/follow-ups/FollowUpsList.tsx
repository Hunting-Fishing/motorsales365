
import React from 'react';
import { FollowUp } from '@/hooks/useFollowUps';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Phone, Calendar, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface FollowUpsListProps {
  followUps: FollowUp[];
  isLoading: boolean;
  error: string | null;
  getInitials: (name: string) => string;
}

export const FollowUpsList: React.FC<FollowUpsListProps> = ({ 
  followUps, 
  isLoading, 
  error,
  getInitials 
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Card className="p-4" key={index}>
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          </Card>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-2">Failed to load follow-ups</p>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }
  
  if (followUps.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg bg-muted/20">
        <p className="text-muted-foreground mb-2">No follow-ups found</p>
        <p className="text-sm text-muted-foreground">
          Create a new follow-up to get started
        </p>
      </div>
    );
  }
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'callback':
        return <Phone className="h-4 w-4" />;
      case 'appointment':
      case 'maintenance':
        return <Calendar className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      console.error('Invalid date:', dateString);
      return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-4">
      {followUps.map(followUp => (
        <Card className="p-4" key={followUp.id}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(followUp.customerName)}&background=random`} 
                  alt={followUp.customerName}
                />
                <AvatarFallback>{getInitials(followUp.customerName)}</AvatarFallback>
              </Avatar>
              
              <div>
                <h3 className="font-medium">{followUp.customerName}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {followUp.type} - Due {formatDate(followUp.dueDate)}
                </p>
                
                {followUp.notes && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {followUp.notes}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" /> Call
                  </Button>
                  <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" /> Message
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <Badge 
                variant="outline" 
                className={`${getStatusColor(followUp.status)} px-2.5 py-0.5`}
              >
                {followUp.status}
              </Badge>
              
              {followUp.assignedToName && (
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <span>Assigned to: {followUp.assignedToName}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
