import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Check } from 'lucide-react';
import { useTimeCards } from '@/hooks/useTimeCards';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function TimeCardManager() {
  const { loading, timeCards, approveTimeCard } = useTimeCards();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time Card Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'completed': return 'secondary';
      case 'disputed': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Card Management
        </CardTitle>
        <CardDescription>
          Review and approve employee time cards
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {timeCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No time cards found
            </div>
          ) : (
            timeCards.slice(0, 10).map((card) => (
              <div
                key={card.id}
                className="p-4 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium mb-1">
                      {format(new Date(card.clock_in_time), 'MMM d, yyyy HH:mm')}
                    </div>
                    {card.clock_out_time && (
                      <div className="text-sm text-muted-foreground mb-2">
                        Out: {format(new Date(card.clock_out_time), 'HH:mm')}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={getStatusColor(card.status)}>
                        {card.status}
                      </Badge>
                      {card.total_hours && (
                        <span className="text-muted-foreground">
                          {card.total_hours.toFixed(2)}h total
                        </span>
                      )}
                      {card.overtime_hours && card.overtime_hours > 0 && (
                        <span className="text-orange-600 font-medium">
                          {card.overtime_hours.toFixed(2)}h OT
                        </span>
                      )}
                    </div>
                    {card.total_pay && (
                      <div className="mt-2 text-sm font-semibold">
                        Pay: ${card.total_pay.toFixed(2)}
                      </div>
                    )}
                  </div>
                  {card.status === 'completed' && (
                    <Button
                      size="sm"
                      onClick={() => approveTimeCard(card.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
