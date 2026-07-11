import React from 'react';
import { SettingsPageHeader } from '@/components/settings/SettingsPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HardHat, BookOpen, Award, Users } from 'lucide-react';

export default function TrainingSettings() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <SettingsPageHeader 
        title="Training" 
        description="Manage training programs and certifications"
      />
      
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardHat className="h-5 w-5" />
              Training Programs
            </CardTitle>
            <CardDescription>
              Create and manage training curricula
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set up training programs with modules, assessments, and completion tracking.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications
            </CardTitle>
            <CardDescription>
              Track certifications and renewals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage certification requirements and expiration tracking for team members.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Learning Resources
            </CardTitle>
            <CardDescription>
              Upload and organize training materials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Store documents, videos, and other resources for team training.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Progress Tracking
            </CardTitle>
            <CardDescription>
              Monitor training completion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View team member progress through training programs and assessments.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
