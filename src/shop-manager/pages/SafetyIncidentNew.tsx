import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { IncidentReportForm } from '@/components/safety/IncidentReportForm';

export default function SafetyIncidentNew() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Report Safety Incident | Shop Management</title>
        <meta name="description" content="Report a new safety incident, injury, or near-miss" />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/safety/incidents')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              Report Safety Incident
            </h1>
            <p className="text-muted-foreground mt-1">
              Document incident details for investigation and compliance
            </p>
          </div>
        </div>

        {/* Form */}
        <IncidentReportForm />
      </div>
    </>
  );
}
