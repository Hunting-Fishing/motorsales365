
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ServiceCategory() {
  const { categoryId } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Service Category</h1>
        <p className="text-muted-foreground">
          Category ID: {categoryId}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Engine Services</CardTitle>
            <CardDescription>Complete engine maintenance and repair</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">12 services available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transmission Services</CardTitle>
            <CardDescription>Transmission repair and maintenance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">8 services available</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
