import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DailyShopInspectionForm } from '@/components/safety/DailyShopInspectionForm';
import { ArrowLeft } from 'lucide-react';

export default function SafetyInspectionNew() {
  return (
    <>
      <Helmet>
        <title>New Daily Inspection | Safety</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/safety/inspections">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inspections
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold">Daily Shop Inspection</h1>
          <p className="text-muted-foreground">Complete the daily safety checklist</p>
        </div>

        <DailyShopInspectionForm />
      </div>
    </>
  );
}
