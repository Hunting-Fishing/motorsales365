
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FeedbackForm() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feedback Form</h1>
        <p className="text-muted-foreground">
          Customer feedback form
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Feedback form will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
