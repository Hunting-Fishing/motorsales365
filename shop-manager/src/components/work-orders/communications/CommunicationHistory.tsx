
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, MessageSquare, Mail, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CustomerCommunication {
  id: string;
  customer_id: string;
  date: string;
  type: 'email' | 'phone' | 'text' | 'in-person';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  staff_member_id: string;
  staff_member_name: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'completed';
  template_id?: string;
  template_name?: string;
  created_at: string;
  updated_at: string;
}

interface CommunicationHistoryProps {
  communications: CustomerCommunication[];
  loading: boolean;
}

export function CommunicationHistory({ communications, loading }: CommunicationHistoryProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'text':
        return <MessageSquare className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'in-person':
        return <User className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return 'success' as const;
      case 'sent':
        return 'default' as const;
      case 'pending':
        return 'warning' as const;
      case 'failed':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (communications.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No communications yet</p>
            <p className="text-sm">Start by sending an SMS or making a call to the customer.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {communications.map((comm) => (
        <Card key={comm.id} className="transition-colors hover:bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getTypeIcon(comm.type)}
                  <span className="font-medium capitalize">{comm.type}</span>
                </div>
                <Badge 
                  variant={comm.direction === 'outbound' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {comm.direction}
                </Badge>
                <Badge variant={getStatusBadgeVariant(comm.status)} className="text-xs">
                  {comm.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(comm.created_at), { addSuffix: true })}
              </div>
            </div>

            {comm.subject && (
              <h4 className="font-medium text-sm mb-2">{comm.subject}</h4>
            )}

            <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
              {comm.content}
            </p>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>By: {comm.staff_member_name}</span>
              {comm.template_name && (
                <span>Template: {comm.template_name}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
