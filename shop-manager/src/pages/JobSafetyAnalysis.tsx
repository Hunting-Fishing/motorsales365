import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { useJSA } from '@/hooks/useJSA';
import { format } from 'date-fns';

export default function JobSafetyAnalysis() {
  const { templates, records, isLoading, createTemplate, createRecord, updateRecordStatus } = useJSA();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);

  const [templateForm, setTemplateForm] = useState({ name: '', description: '', job_category: '', required_ppe: '' });
  const [recordForm, setRecordForm] = useState({ job_title: '', job_description: '', work_location: '', overall_risk_level: 'medium' });

  const handleCreateTemplate = () => {
    createTemplate.mutate({
      ...templateForm,
      required_ppe: templateForm.required_ppe.split(',').map(s => s.trim()).filter(Boolean)
    }, {
      onSuccess: () => {
        setTemplateDialogOpen(false);
        setTemplateForm({ name: '', description: '', job_category: '', required_ppe: '' });
      }
    });
  };

  const handleCreateRecord = () => {
    createRecord.mutate(recordForm, {
      onSuccess: () => {
        setRecordDialogOpen(false);
        setRecordForm({ job_title: '', job_description: '', work_location: '', overall_risk_level: 'medium' });
      }
    });
  };

  const getRiskBadge = (level: string | null) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[level || 'medium']}>{level || 'Not assessed'}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      pending_approval: 'outline',
      approved: 'default',
      rejected: 'destructive',
      expired: 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Job Safety Analysis</h1>
          <p className="text-muted-foreground">Hazard identification and risk assessment</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-sm text-muted-foreground">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{records.filter(r => r.status === 'approved').length}</p>
                <p className="text-sm text-muted-foreground">Approved JSAs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{records.filter(r => r.status === 'pending_approval').length}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{records.filter(r => r.overall_risk_level === 'high' || r.overall_risk_level === 'critical').length}</p>
                <p className="text-sm text-muted-foreground">High Risk Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">JSA Records</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New JSA</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Job Safety Analysis</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div><Label>Job Title</Label><Input value={recordForm.job_title} onChange={e => setRecordForm({...recordForm, job_title: e.target.value})} /></div>
                  <div><Label>Job Description</Label><Textarea value={recordForm.job_description} onChange={e => setRecordForm({...recordForm, job_description: e.target.value})} /></div>
                  <div><Label>Work Location</Label><Input value={recordForm.work_location} onChange={e => setRecordForm({...recordForm, work_location: e.target.value})} /></div>
                  <div>
                    <Label>Overall Risk Level</Label>
                    <select className="w-full border rounded p-2" value={recordForm.overall_risk_level} onChange={e => setRecordForm({...recordForm, overall_risk_level: e.target.value})}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <Button onClick={handleCreateRecord} disabled={createRecord.isPending}>Create JSA</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {records.map(record => (
              <Card key={record.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{record.job_title}</CardTitle>
                    {getStatusBadge(record.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {record.job_description && <p className="text-sm text-muted-foreground line-clamp-2">{record.job_description}</p>}
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Risk Level:</span>
                    {getRiskBadge(record.overall_risk_level)}
                  </div>
                  {record.work_location && <p className="text-sm">📍 {record.work_location}</p>}
                  <p className="text-xs text-muted-foreground">{format(new Date(record.assessment_date), 'PP')}</p>
                  {record.status === 'pending_approval' && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => updateRecordStatus.mutate({ id: record.id, status: 'approved', supervisor_approval_date: new Date().toISOString() })}>
                        <CheckCircle className="h-4 w-4 mr-1" />Approve
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {records.length === 0 && !isLoading && (
              <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">No JSA records found</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New Template</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create JSA Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div><Label>Template Name</Label><Input value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} /></div>
                  <div><Label>Description</Label><Textarea value={templateForm.description} onChange={e => setTemplateForm({...templateForm, description: e.target.value})} /></div>
                  <div><Label>Job Category</Label><Input value={templateForm.job_category} onChange={e => setTemplateForm({...templateForm, job_category: e.target.value})} /></div>
                  <div><Label>Required PPE (comma-separated)</Label><Input value={templateForm.required_ppe} onChange={e => setTemplateForm({...templateForm, required_ppe: e.target.value})} placeholder="Hard hat, Safety glasses, Gloves" /></div>
                  <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending}>Create Template</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(template => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
                  {template.job_category && <p className="text-sm">Category: {template.job_category}</p>}
                  {template.required_ppe && template.required_ppe.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.required_ppe.map((ppe, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{ppe}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && !isLoading && (
              <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">No JSA templates found</CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
