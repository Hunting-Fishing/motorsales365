import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SepticInspectionFormTemplate from '@/components/septic/inspection/SepticInspectionFormTemplate';

export default function SepticInspectionForm() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, any>>({});
  const [header, setHeader] = useState({
    location: '',
    date: new Date().toISOString().split('T')[0],
    assignedTo: '',
    signedBy: null as string | null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['septic-inspection-form', templateId],
    queryFn: async () => {
      if (!templateId) throw new Error('No template ID');

      const { data: tmpl } = await supabase
        .from('septic_inspection_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      const { data: secs } = await supabase
        .from('septic_inspection_template_sections')
        .select('*')
        .eq('template_id', templateId)
        .order('display_order');

      const sectionsWithItems = [];
      for (const sec of secs || []) {
        const { data: items } = await supabase
          .from('septic_inspection_template_items')
          .select('*')
          .eq('section_id', sec.id)
          .order('display_order');
        sectionsWithItems.push({ ...sec, items: items || [] });
      }

      return { template: tmpl, sections: sectionsWithItems };
    },
    enabled: !!templateId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.template) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Form template not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const handlePrint = () => window.print();

  const handleSave = () => {
    // Future: save inspection record to septic_inspection_records
    toast.success('Inspection form saved (preview mode)');
    console.log('Form data:', { header, values });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" /> Save Inspection
        </Button>
      </div>

      <SepticInspectionFormTemplate
        templateName={data.template.name}
        templateDescription={data.template.description || undefined}
        sections={data.sections}
        interactive={true}
        values={values}
        headerValues={header}
        onValuesChange={setValues}
        onHeaderChange={setHeader}
        onPrint={handlePrint}
      />
    </div>
  );
}
