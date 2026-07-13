
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText } from "lucide-react";

export function FeedbackFormsList() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Feedback Forms</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              No forms created yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Start collecting feedback from your customers by creating your first feedback form.
            </p>
            <Button variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Your First Form
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
