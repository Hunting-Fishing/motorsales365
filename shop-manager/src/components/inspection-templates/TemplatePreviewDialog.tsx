import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useInspectionTemplate } from '@/hooks/useInspectionTemplates';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ASSET_TYPE_LABELS, ITEM_TYPE_LABELS } from '@/types/inspectionTemplate';
import { GYRSelectorWithDeficiency, GYRStatus, DeficiencyData } from '@/components/equipment/GYRSelectorWithDeficiency';
import { 
  Circle, 
  ToggleLeft, 
  Type, 
  Hash, 
  Calendar, 
  Clock,
  AlertCircle,
  Info
} from 'lucide-react';

interface TemplatePreviewDialogProps {
  templateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ITEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  gyr_status: <Circle className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  checkbox: <ToggleLeft className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  hour_meter: <Clock className="h-4 w-4" />,
};

export function TemplatePreviewDialog({ templateId, open, onOpenChange }: TemplatePreviewDialogProps) {
  const { data: template, isLoading } = useInspectionTemplate(templateId);
  const [previewValues, setPreviewValues] = useState<Record<string, GYRStatus>>({});
  const [previewDeficiencies, setPreviewDeficiencies] = useState<Record<string, DeficiencyData>>({});

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPreviewValues({});
      setPreviewDeficiencies({});
    }
  }, [open]);

  const handleGYRChange = (itemKey: string, status: GYRStatus, defData?: DeficiencyData) => {
    setPreviewValues(prev => ({ ...prev, [itemKey]: status }));
    if (defData) {
      setPreviewDeficiencies(prev => ({ ...prev, [itemKey]: defData }));
    } else if (status === 3) {
      // Clear deficiency if set to Green
      setPreviewDeficiencies(prev => {
        const updated = { ...prev };
        delete updated[itemKey];
        return updated;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Template Preview
            {template && (
              <Badge variant={template.is_published ? 'default' : 'secondary'}>
                {template.is_published ? 'Published' : 'Draft'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : template ? (
          <div className="space-y-6">
            {/* Interactive Preview Banner */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This is an interactive preview. Click on the GYR buttons to test the deficiency dialog. Data will not be saved.
              </AlertDescription>
            </Alert>

            {/* Template Header */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{template.name}</h2>
              {template.description && (
                <p className="text-muted-foreground">{template.description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{ASSET_TYPE_LABELS[template.asset_type]}</Badge>
                <Badge variant="outline">Version {template.version}</Badge>
                {template.is_base_template && (
                  <Badge variant="secondary">Base Template</Badge>
                )}
              </div>
            </div>

            {/* Sections Preview */}
            {template.sections && template.sections.length > 0 ? (
              <Accordion type="multiple" defaultValue={template.sections.map(s => s.id)} className="space-y-2">
                {template.sections
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((section) => (
                    <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{section.title}</span>
                          <Badge variant="outline" className="ml-2">
                            {section.items?.length || 0} items
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {section.description && (
                          <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                        )}
                        
                        {section.items && section.items.length > 0 ? (
                          <div className="space-y-2">
                            {section.items
                              .sort((a, b) => a.display_order - b.display_order)
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="text-muted-foreground">
                                      {ITEM_TYPE_ICONS[item.item_type] || <Circle className="h-4 w-4" />}
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{item.item_name}</p>
                                      {item.description && (
                                        <p className="text-xs text-muted-foreground">{item.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {item.item_type === 'gyr_status' ? (
                                      <GYRSelectorWithDeficiency
                                        value={previewValues[item.item_key] ?? 3}
                                        onChange={(status, defData) => handleGYRChange(item.item_key, status, defData)}
                                        itemName={item.item_name}
                                        deficiencyData={previewDeficiencies[item.item_key]}
                                      />
                                    ) : (
                                      <Badge variant="outline" className="text-xs">
                                        {ITEM_TYPE_LABELS[item.item_type]}
                                      </Badge>
                                    )}
                                    {item.is_required && (
                                      <Badge variant="destructive" className="text-xs">
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No items in this section</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            ) : (
              <div className="text-center py-8 border rounded-lg bg-muted/20">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No sections in this template</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Template not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
