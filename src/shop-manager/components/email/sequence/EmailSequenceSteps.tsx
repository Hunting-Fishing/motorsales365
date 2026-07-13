
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmailSequenceStep } from '@/types/email';
import { EmailSequenceFlow } from './EmailSequenceFlow';

interface EmailSequenceStepsProps {
  sequenceId: string;
  steps: EmailSequenceStep[];
}

export function EmailSequenceSteps({ sequenceId, steps }: EmailSequenceStepsProps) {
  if (!steps || steps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sequence Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>This sequence doesn't have any steps yet.</p>
            <p className="mt-2">Add steps to define the email sequence flow.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sequence Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <EmailSequenceFlow 
          sequence={{ 
            id: sequenceId, 
            steps, 
            name: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }} 
        />
      </CardContent>
    </Card>
  );
}
