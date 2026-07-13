import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Plus, RefreshCw, AlertTriangle, CheckCircle, Clock, BookOpen } from 'lucide-react';
import { useSafetyTraining } from '@/hooks/useSafetyTraining';
import { TrainingCoursesTab } from '@/components/safety/training/TrainingCoursesTab';
import { TrainingAssignmentsTab } from '@/components/safety/training/TrainingAssignmentsTab';
import { TrainingMatrixTab } from '@/components/safety/training/TrainingMatrixTab';

export default function SafetyTraining() {
  const { 
    loading, 
    courses, 
    assignments, 
    overdueCount, 
    expiringCount, 
    completionRate,
    createCourse,
    assignTraining,
    updateAssignment,
    refetch 
  } = useSafetyTraining();
  const [activeTab, setActiveTab] = useState('assignments');

  return (
    <>
      <Helmet>
        <title>Safety Training | Shop Management</title>
        <meta name="description" content="Manage safety training courses and track employee certifications" />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              Safety Training
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage training courses and track employee certifications
            </p>
          </div>
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courses.length}</div>
              <p className="text-xs text-muted-foreground">Training programs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
              <p className="text-xs text-muted-foreground">Training completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Training</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
              <p className="text-xs text-muted-foreground">Past due date</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{expiringCount}</div>
              <p className="text-xs text-muted-foreground">Within 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="assignments">Training Assignments</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="matrix">Training Matrix</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <TrainingAssignmentsTab 
              assignments={assignments}
              courses={courses}
              loading={loading}
              onAssign={assignTraining}
              onUpdate={updateAssignment}
            />
          </TabsContent>

          <TabsContent value="courses">
            <TrainingCoursesTab 
              courses={courses}
              loading={loading}
              onCreate={createCourse}
            />
          </TabsContent>

          <TabsContent value="matrix">
            <TrainingMatrixTab 
              assignments={assignments}
              courses={courses}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
