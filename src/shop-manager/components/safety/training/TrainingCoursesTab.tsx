import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BookOpen, Clock, RefreshCw, Users } from 'lucide-react';

interface Course {
  id: string;
  course_name: string;
  description: string | null;
  duration_hours: number | null;
  recertification_months: number | null;
  is_required: boolean;
  category: string | null;
  created_at: string;
}

interface Props {
  courses: Course[];
  loading: boolean;
  onCreate: (data: Partial<Course>) => Promise<boolean>;
}

export function TrainingCoursesTab({ courses, loading, onCreate }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    course_name: '',
    description: '',
    duration_hours: '',
    recertification_months: '',
    is_required: false,
    category: 'safety'
  });

  const handleSubmit = async () => {
    const success = await onCreate({
      course_name: formData.course_name,
      description: formData.description || null,
      duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : null,
      recertification_months: formData.recertification_months ? parseInt(formData.recertification_months) : null,
      is_required: formData.is_required,
      category: formData.category
    });
    if (success) {
      setDialogOpen(false);
      setFormData({
        course_name: '',
        description: '',
        duration_hours: '',
        recertification_months: '',
        is_required: false,
        category: 'safety'
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  const categories = [...new Set(courses.map(c => c.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Training Courses</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Training Course</DialogTitle>
              <DialogDescription>Add a new training course to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Course Name *</Label>
                <Input
                  value={formData.course_name}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                  placeholder="e.g., WHMIS Training"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Course description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (hours)</Label>
                  <Input
                    type="number"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                    placeholder="e.g., 4"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recertification Period (months)</Label>
                  <Input
                    type="number"
                    value={formData.recertification_months}
                    onChange={(e) => setFormData({ ...formData, recertification_months: e.target.value })}
                    placeholder="e.g., 12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="emergency">Emergency Response</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_required"
                  checked={formData.is_required}
                  onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_required">Required for all employees</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!formData.course_name}>Create Course</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No training courses configured</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first course to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <Card key={course.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{course.course_name}</CardTitle>
                  {course.is_required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                </div>
                {course.category && (
                  <Badge variant="outline" className="w-fit capitalize">{course.category}</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {course.description || 'No description provided'}
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  {course.duration_hours && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {course.duration_hours}h
                    </div>
                  )}
                  {course.recertification_months && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <RefreshCw className="h-4 w-4" />
                      Every {course.recertification_months} months
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
