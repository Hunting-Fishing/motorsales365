import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Play, Edit, Trash2, RefreshCw, Calendar } from 'lucide-react';
import { useRecurringJournalTemplates } from '@/hooks/useRecurringJournalTemplates';
import { format } from 'date-fns';

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export function RecurringJournalTemplatesPanel() {
  const { templates, isLoading, createTemplate, deleteTemplate, runTemplate } = useRecurringJournalTemplates();
  const [showDialog, setShowDialog] = useState(false);

  const [form, setForm] = useState({
    template_name: '',
    description: '',
    frequency: 'monthly',
    is_active: true,
    auto_post: false,
    next_run_date: '',
  });

  const resetForm = () => {
    setForm({
      template_name: '',
      description: '',
      frequency: 'monthly',
      is_active: true,
      auto_post: false,
      next_run_date: '',
    });
  };

  const handleSubmit = () => {
    createTemplate.mutate({
      template_name: form.template_name,
      description: form.description,
      frequency: form.frequency,
      is_active: form.is_active,
      auto_post: form.auto_post,
      next_run_date: form.next_run_date || undefined,
    });
    setShowDialog(false);
    resetForm();
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Recurring Journal Templates</h2>
          <p className="text-sm text-muted-foreground">Automate repetitive journal entries</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Recurring Template</DialogTitle>
              <DialogDescription>Set up an automated journal entry template</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input value={form.template_name} onChange={e => setForm({ ...form, template_name: e.target.value })} placeholder="Monthly Depreciation" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Next Run Date</Label>
                <Input type="date" value={form.next_run_date} onChange={e => setForm({ ...form, next_run_date: e.target.value })} />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.auto_post} onCheckedChange={v => setForm({ ...form, auto_post: v })} />
                  <Label>Auto-post entries</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.template_name}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Run</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map(template => (
              <TableRow key={template.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{template.template_name}</span>
                    {template.description && <p className="text-xs text-muted-foreground">{template.description}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{template.frequency}</Badge>
                </TableCell>
                <TableCell>
                  {template.next_run_date ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(template.next_run_date), 'MMM d, yyyy')}
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {template.last_run_date ? format(new Date(template.last_run_date), 'MMM d, yyyy') : 'Never'}
                </TableCell>
                <TableCell>
                  {template.is_active ? (
                    <Badge className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => runTemplate.mutate(template.id)} title="Run Now">
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteTemplate.mutate(template.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No recurring templates yet. Create one to automate journal entries.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
