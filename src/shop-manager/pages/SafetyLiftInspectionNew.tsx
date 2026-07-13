import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LiftInspectionForm } from '@/components/safety/LiftInspectionForm';
import { ArrowLeft } from 'lucide-react';

export default function SafetyLiftInspectionNew() {
  return (
    <>
      <Helmet>
        <title>New Lift Inspection | Safety</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/safety/equipment">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Equipment
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold">Lift/Hoist Inspection</h1>
          <p className="text-muted-foreground">Complete equipment safety inspection</p>
        </div>

        <LiftInspectionForm />
      </div>
    </>
  );
}
