
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FeedbackAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feedback Analytics</h1>
        <p className="text-muted-foreground">
          Analyze customer feedback data
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Feedback analytics will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
