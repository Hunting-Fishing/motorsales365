import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useScheduling } from '@/hooks/useScheduling';

export function PTOManagement() {
  const { ptoBalances, loading } = useScheduling();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>PTO Balances</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading PTO balances...</div>
          ) : ptoBalances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No PTO balances configured yet
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ptoBalances.map(balance => {
                const usedPercentage = (balance.used_days / balance.total_allocated) * 100;
                const pendingPercentage = (balance.pending_days / balance.total_allocated) * 100;

                return (
                  <Card key={balance.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {balance.time_off_types?.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Used</span>
                          <span className="font-medium">
                            {balance.used_days} / {balance.total_allocated} days
                          </span>
                        </div>
                        <Progress value={usedPercentage} className="h-2" />
                      </div>

                      {balance.pending_days > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Pending</span>
                            <span className="font-medium">
                              {balance.pending_days} days
                            </span>
                          </div>
                          <Progress value={pendingPercentage} className="h-2 bg-yellow-100" />
                        </div>
                      )}

                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Remaining</span>
                          <span className="text-green-600">
                            {balance.remaining_days} days
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
