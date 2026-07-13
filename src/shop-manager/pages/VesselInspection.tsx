import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Ship, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VesselInspectionForm } from '@/components/safety/vessel/VesselInspectionForm';
import { VesselInspectionHistory } from '@/components/safety/vessel/VesselInspectionHistory';

export default function VesselInspection() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Vessel Inspection | Safety</title>
        <meta name="description" content="Perform daily vessel pre-trip inspections with dynamic equipment-based forms" />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/safety')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Ship className="h-6 w-6 text-primary" />
                Vessel Inspection
              </h1>
              <p className="text-muted-foreground">
                Daily pre-trip inspection with equipment-specific checklists
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="inspection" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inspection" className="flex items-center gap-2">
              <Ship className="h-4 w-4" />
              New Inspection
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inspection">
            <VesselInspectionForm />
          </TabsContent>

          <TabsContent value="history">
            <VesselInspectionHistory />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
