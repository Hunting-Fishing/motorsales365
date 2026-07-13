
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ServiceJob() {
  const { jobId } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Service Job Details</h1>
        <p className="text-muted-foreground">
          Job ID: {jobId}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Oil Change Service
            <Badge variant="secondary">Active</Badge>
          </CardTitle>
          <CardDescription>Complete oil and filter replacement service</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold">Duration</h3>
              <p className="text-muted-foreground">30-45 minutes</p>
            </div>
            <div>
              <h3 className="font-semibold">Price</h3>
              <p className="text-muted-foreground">$49.99</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold">Description</h3>
            <p className="text-muted-foreground">
              Complete oil drain and refill with new filter installation. 
              Includes 19-point inspection and fluid level check.
            </p>
          </div>

          <div>
            <h3 className="font-semibold">Required Parts</h3>
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Engine oil (5 quarts)</li>
              <li>Oil filter</li>
              <li>Drain plug gasket</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
