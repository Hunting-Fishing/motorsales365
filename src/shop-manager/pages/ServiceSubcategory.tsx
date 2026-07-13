
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ServiceSubcategory() {
  const { categoryId, subcategoryId } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Service Subcategory</h1>
        <p className="text-muted-foreground">
          Category: {categoryId} | Subcategory: {subcategoryId}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Basic Oil Change</CardTitle>
            <CardDescription>Standard oil and filter change</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$39.99</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Synthetic Oil Change</CardTitle>
            <CardDescription>Premium synthetic oil change</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$59.99</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
