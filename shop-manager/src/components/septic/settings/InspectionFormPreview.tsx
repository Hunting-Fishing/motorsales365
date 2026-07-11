import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SepticInspectionFormTemplate from '@/components/septic/inspection/SepticInspectionFormTemplate';

interface Props {
  templateId: string;
  onClose: () => void;
}

export default function InspectionFormPreview({ templateId, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['septic-inspection-template-preview', templateId],
    queryFn: async () => {
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
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { template, sections } = data || { template: null, sections: [] };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Preview: {template?.name}</h2>
          <p className="text-sm text-muted-foreground">{template?.description}</p>
        </div>
      </div>

      <div className="border-2 border-dashed border-emerald-300 rounded-xl p-1">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 text-center text-sm text-emerald-700 dark:text-emerald-300 font-medium">
          📋 Preview Mode — This is how the form appears to inspectors
        </div>
      </div>

      <SepticInspectionFormTemplate
        templateName={template?.name || ''}
        templateDescription={template?.description || undefined}
        sections={sections}
        interactive={false}
      />

      <Button variant="outline" onClick={onClose} className="w-full">
        Close Preview
      </Button>
    </div>
  );
}
