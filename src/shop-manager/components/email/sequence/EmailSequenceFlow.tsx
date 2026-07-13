
import React from 'react';
import { EmailSequence, EmailSequenceStep } from '@/types/email';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Mail, Clock, ArrowDown, GitBranch, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EmailSequenceFlowProps {
  sequence: EmailSequence;
}

export const EmailSequenceFlow: React.FC<EmailSequenceFlowProps> = ({ sequence }) => {
  if (!sequence?.steps || sequence.steps.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">This sequence doesn't have any steps yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sequence.steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <StepItem step={step} stepNumber={index + 1} />
          {index < sequence.steps.length - 1 && (
            <div className="flex justify-center my-2">
              <ArrowDown className="text-gray-400" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

interface StepItemProps {
  step: EmailSequenceStep;
  stepNumber: number;
}

const StepItem: React.FC<StepItemProps> = ({ step, stepNumber }) => {
  const hasCondition = step.condition && (step.condition.type === 'event' || step.condition.type === 'property');
  
  return (
    <Card>
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 p-4 ${
        step.type === 'email' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
      }`}>
        <div className="flex items-center">
          {step.type === 'email' ? (
            <Mail className="h-4 w-4 text-blue-500 mr-2" />
          ) : (
            <Clock className="h-4 w-4 text-gray-500 mr-2" />
          )}
          <span className="font-medium">
            Step {stepNumber}: {step.name || (step.type === 'email' ? 'Send Email' : 'Wait')}
          </span>
        </div>
        
        {hasCondition && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <GitBranch className="h-4 w-4 text-amber-500 mr-1" />
                  <Badge variant="outline" className="bg-amber-50">Conditional</Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {step.condition.type === 'event' 
                    ? `Runs only if event "${step.condition.value}" occurs` 
                    : `Requires property "${step.condition.value}" ${step.condition.operator} condition`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>
      <CardContent className="p-4">
        {step.type === 'email' ? (
          <div>
            <p className="text-sm">
              {step.templateId || step.email_template_id ? `Template ID: ${step.templateId || step.email_template_id}` : 'No template selected'}
            </p>
            {hasCondition && (
              <div className="mt-2 text-xs text-amber-600 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Condition: {step.condition.type === 'event' 
                  ? `If "${step.condition.value}" occurs` 
                  : `If property "${step.condition.value}" ${step.condition.operator} value`}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm">
              Wait for {step.delayHours || 0} hours ({step.delayType || 'fixed'})
            </p>
            {hasCondition && (
              <div className="mt-2 text-xs text-amber-600 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Condition: {step.condition.type === 'event' 
                  ? `If "${step.condition.value}" occurs` 
                  : `If property "${step.condition.value}" ${step.condition.operator} value`}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
