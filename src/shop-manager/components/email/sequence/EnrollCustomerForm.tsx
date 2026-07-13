
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
} from '@/components/ui/form';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Tag, 
  GanttChart, 
  UserCircle2, 
  Braces
} from 'lucide-react';
import { useEnrollCustomerForm } from './hooks/useEnrollCustomerForm';
import { SequenceSelector } from './form-fields/SequenceSelector';
import { PersonalizationFields } from './form-fields/PersonalizationFields';
import { SegmentFields } from './form-fields/SegmentFields';
import { MetadataEditor } from './form-fields/MetadataEditor';

interface EnrollCustomerFormProps {
  customerId: string;
  onEnroll?: (enrollmentId: string) => void;
}

export const EnrollCustomerForm: React.FC<EnrollCustomerFormProps> = ({
  customerId,
  onEnroll
}) => {
  const {
    form,
    open,
    setOpen,
    sequences,
    loading,
    personalizationFields,
    segmentFields,
    metadataJson,
    setMetadataJson,
    addPersonalizationField,
    updatePersonalizationField,
    removePersonalizationField,
    addSegmentField,
    updateSegmentField,
    removeSegmentField,
    handleSubmit
  } = useEnrollCustomerForm(customerId, onEnroll);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GanttChart className="mr-2 h-4 w-4" /> Enroll in Sequence
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enroll Customer in Email Sequence</DialogTitle>
          <DialogDescription>
            Select a sequence to enroll this customer in and customize with personalization options.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="sequenceId"
              render={({ field }) => (
                <SequenceSelector 
                  value={field.value}
                  onChange={field.onChange}
                  sequences={sequences}
                  loading={loading}
                />
              )}
            />
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="personalizations">
                <AccordionTrigger>
                  <div className="flex items-center">
                    <UserCircle2 className="mr-2 h-4 w-4" />
                    Personalization Variables
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <PersonalizationFields 
                    fields={personalizationFields}
                    updateField={updatePersonalizationField}
                    removeField={removePersonalizationField}
                    addField={addPersonalizationField}
                  />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="segmentation">
                <AccordionTrigger>
                  <div className="flex items-center">
                    <Tag className="mr-2 h-4 w-4" />
                    Segment Data
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <SegmentFields 
                    fields={segmentFields}
                    updateField={updateSegmentField}
                    removeField={removeSegmentField}
                    addField={addSegmentField}
                  />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="metadata">
                <AccordionTrigger>
                  <div className="flex items-center">
                    <Braces className="mr-2 h-4 w-4" />
                    Custom Metadata
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <MetadataEditor 
                    value={metadataJson}
                    onChange={setMetadataJson}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                Enroll Customer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
