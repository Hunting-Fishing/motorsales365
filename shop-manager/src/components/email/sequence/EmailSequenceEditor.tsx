
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useEmailSequences } from '@/hooks/email/useEmailSequences';
import { useEmailTemplates } from '@/hooks/email/useEmailTemplates';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { 
  EmailSequence, EmailSequenceStep, EmailTemplate 
} from '@/types/email';
import { 
  DragDropContext, Droppable, Draggable, DropResult 
} from 'react-beautiful-dnd';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, XCircle, ArrowRight, Clock, Mail, ChevronDown, ChevronUp, 
  GripVertical, Settings, Save, ArrowLeft, Trash2 
} from 'lucide-react';
import { Label } from '@/components/ui/label';

interface EmailSequenceEditorProps {
  sequence?: EmailSequence;
  onSave: (sequence: Partial<EmailSequence>) => Promise<any>;
  onCancel?: () => void;
}

const reorder = (list: any[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

export const EmailSequenceEditor: React.FC<EmailSequenceEditorProps> = ({ sequence, onSave, onCancel }) => {
  const [name, setName] = useState(sequence?.name || "");
  const [description, setDescription] = useState(sequence?.description || "");
  const [triggerType, setTriggerType] = useState<"manual" | "event" | "schedule">(
    (sequence?.triggerType || sequence?.trigger_type || 'manual') as "manual" | "event" | "schedule"
  );
  const [triggerEvent, setTriggerEvent] = useState(sequence?.triggerEvent || sequence?.trigger_event || '');
  const [isActive, setIsActive] = useState(sequence?.isActive || sequence?.is_active || false);
  const [steps, setSteps] = useState<EmailSequenceStep[]>(sequence?.steps || []);
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>(undefined);
  const { templates } = useEmailTemplates();

  useEffect(() => {
    if (sequence) {
      setName(sequence.name);
      setDescription(sequence.description || '');
      setTriggerType((sequence.triggerType || sequence.trigger_type || 'manual') as "manual" | "event" | "schedule");
      setTriggerEvent(sequence.triggerEvent || sequence.trigger_event || '');
      setIsActive(sequence.isActive || sequence.is_active || false);
      setSteps(sequence.steps || []);
    }
  }, [sequence]);

  const addStep = (type: 'delay' | 'email') => {
    const newStep: Partial<EmailSequenceStep> = {
      id: `temp-${Date.now()}`,
      sequence_id: sequence?.id || '',
      type: type,
      order: steps.length,
      name: type === 'delay' ? 'Wait' : 'Send Email',
      templateId: '',
      email_template_id: '',
      delayHours: type === 'delay' ? 24 : 0,
      delayType: 'fixed',
      position: steps.length,
      isActive: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  
    setSteps([...steps, newStep as EmailSequenceStep]);
  };

  const updateStep = (id: string, updates: Partial<EmailSequenceStep>) => {
    setSteps(prev =>
      prev.map(step =>
        step.id === id ? { ...step, ...updates } : step
      )
    );
  };

  const deleteStep = (id: string) => {
    setSteps(prev => prev.filter(step => step.id !== id));
  };

  const handleSave = async () => {
    const sequenceData: Partial<EmailSequence> = {
      id: sequence?.id,
      name,
      description,
      triggerType,
      trigger_type: triggerType,
      triggerEvent,
      trigger_event: triggerEvent,
      isActive,
      is_active: isActive,
      steps
    };
    await onSave(sequenceData);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    if (result.destination.index === result.source.index) {
      return;
    }

    const newSteps = reorder(steps, result.source.index, result.destination.index);
    setSteps(newSteps);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sequence Details</CardTitle>
          <CardDescription>Basic information about the email sequence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Sequence Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Sequence Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select 
                value={triggerType} 
                onValueChange={(value: "manual" | "event" | "schedule") => setTriggerType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Trigger Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="triggerEvent">Trigger Event</Label>
              <Input
                id="triggerEvent"
                placeholder="Event Name"
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sequence Steps</CardTitle>
          <CardDescription>Define the steps in the email sequence</CardDescription>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="steps">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {steps.map((step, index) => (
                    <Draggable key={step.id} draggableId={step.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="border rounded-md p-4 bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="mr-2 h-4 w-4 text-gray-500 cursor-move" />
                              </div>
                              <h3 className="text-sm font-medium">{step.name || `Step ${index + 1}`}</h3>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => deleteStep(step.id)}>
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                          <Separator className="my-2" />
                          {step.type === 'delay' ? (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`delayHours-${step.id}`}>Delay Hours</Label>
                                <Input
                                  id={`delayHours-${step.id}`}
                                  type="number"
                                  placeholder="Delay Hours"
                                  value={step.delayHours || ''}
                                  onChange={(e) => updateStep(step.id, { delayHours: parseInt(e.target.value) })}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`delayType-${step.id}`}>Delay Type</Label>
                                <Select
                                  value={step.delayType || 'fixed'}
                                  onValueChange={(value: "fixed" | "business_days") => updateStep(step.id, { delayType: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Delay Type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                    <SelectItem value="business_days">Business Days</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <Label htmlFor={`template-${step.id}`}>Email Template</Label>
                              {templates && (
                                <Select
                                  value={selectedTemplate}
                                  onValueChange={(value) => {
                                    const template = templates.find(t => t.id === value);
                                    if (template && !template.is_archived) {
                                      setSelectedTemplate(value);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a template" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {templates.map(template => (
                                      <SelectItem 
                                        key={template.id} 
                                        value={template.id}
                                        disabled={template.is_archived}
                                      >
                                        {template.name} {template.is_archived && "(Archived)"}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" onClick={() => addStep('delay')}>
            <Plus className="mr-2 h-4 w-4" /> Add Delay
          </Button>
          <Button variant="outline" onClick={() => addStep('email')}>
            <Plus className="mr-2 h-4 w-4" /> Add Email
          </Button>
        </CardFooter>
      </Card>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
};
