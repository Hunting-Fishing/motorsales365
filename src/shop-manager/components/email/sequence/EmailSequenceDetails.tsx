
import React, { useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { useEmailSequences } from '@/hooks/email/useEmailSequences';
import { EmailSequenceSteps } from './EmailSequenceSteps';
import { EmailSequenceEnrollments } from './EmailSequenceEnrollments';
import { EmailSequenceAnalytics } from './EmailSequenceAnalytics';
import { EmailSequenceProcessButton } from './EmailSequenceProcessButton';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, Play, Users, Activity, ListChecks 
} from 'lucide-react';

interface EmailSequenceDetailsProps {
  sequenceId: string;
}

export function EmailSequenceDetails({ sequenceId }: EmailSequenceDetailsProps) {
  const navigate = useNavigate();
  const { 
    currentSequence, 
    sequenceLoading, 
    fetchSequenceById, 
    deleteSequence 
  } = useEmailSequences();

  useEffect(() => {
    if (sequenceId) {
      fetchSequenceById(sequenceId);
    }
  }, [sequenceId, fetchSequenceById]);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this sequence?')) {
      const success = await deleteSequence(sequenceId);
      if (success) {
        navigate('/email-sequences');
      }
    }
  };

  const handleBack = () => {
    navigate('/email-sequences');
  };

  if (sequenceLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Loading Sequence...</h1>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentSequence) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Sequence Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-4">
                The requested sequence could not be found.
              </p>
              <Button onClick={handleBack}>
                Return to Sequences
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center">
              {currentSequence.name}
              {currentSequence.isActive ? (
                <Badge className="ml-2 bg-green-500">Active</Badge>
              ) : (
                <Badge className="ml-2" variant="outline">Inactive</Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentSequence.description || 'No description provided'}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <EmailSequenceProcessButton sequenceId={sequenceId} />
          <Button variant="outline" onClick={() => navigate(`/email-sequence-editor/${sequenceId}`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sequence Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Trigger Type</dt>
                <dd className="text-base">{currentSequence.triggerType || 'Manual'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Trigger Event</dt>
                <dd className="text-base">{currentSequence.triggerEvent || 'None'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                <dd className="text-base">{new Date(currentSequence.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="steps" className="space-y-4">
          <TabsList>
            <TabsTrigger value="steps" className="flex items-center">
              <ListChecks className="mr-2 h-4 w-4" />
              Steps
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Enrollments
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center">
              <Activity className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="steps" className="space-y-4">
            <EmailSequenceSteps 
              sequenceId={sequenceId} 
              steps={currentSequence.steps} 
            />
          </TabsContent>
          
          <TabsContent value="enrollments" className="space-y-4">
            <EmailSequenceEnrollments 
              sequenceId={sequenceId} 
            />
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <EmailSequenceAnalytics 
              sequenceId={sequenceId} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
