
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Reminders() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Service Reminders</h1>
        <p className="text-muted-foreground">
          Manage service reminders and notifications
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Service reminders will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
