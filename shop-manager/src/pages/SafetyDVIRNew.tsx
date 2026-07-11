import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DVIRForm } from '@/components/safety/DVIRForm';
import { ArrowLeft } from 'lucide-react';

export default function SafetyDVIRNew() {
  return (
    <>
      <Helmet>
        <title>New DVIR | Safety</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/safety/dvir">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to DVIR
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold">Vehicle Inspection Report</h1>
          <p className="text-muted-foreground">Complete pre-trip or post-trip inspection</p>
        </div>

        <DVIRForm />
      </div>
    </>
  );
}
