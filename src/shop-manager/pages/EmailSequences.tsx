
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useEmailSequences } from '@/hooks/email/useEmailSequences';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Mail, ArrowRight, Clock, Play, BarChart2, 
  Trash2, Calendar, PauseCircle, ScrollText 
} from 'lucide-react';
import { ManageSequenceProcessingButton } from '@/components/email/sequence/ManageSequenceProcessingButton';

const sequenceSchema = z.object({
  name: z.string().min(2, {
    message: "Sequence name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  triggerType: z.enum(['manual', 'event', 'schedule']),
  triggerEvent: z.string().optional(),
});

export default function EmailSequences() {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { sequences, loading, fetchSequences, deleteSequence } = useEmailSequences();

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const form = useForm<z.infer<typeof sequenceSchema>>({
    resolver: zodResolver(sequenceSchema),
    defaultValues: {
      name: "",
      description: "",
      triggerType: 'manual',
      triggerEvent: '',
    },
  });

  const { createSequence } = useEmailSequences();

  const onSubmit = async (values: z.infer<typeof sequenceSchema>) => {
    await createSequence(values);
    setIsCreateModalOpen(false);
    form.reset();
    fetchSequences();
  };

  const handleDelete = async (id: string) => {
    await deleteSequence(id);
    fetchSequences();
  };

  const CreatedAtCell = ({ sequence }) => (
    <div className="text-sm text-muted-foreground">
      {format(new Date(sequence.created_at), 'MMM d, yyyy')}
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Sequences</h1>
          <p className="text-muted-foreground">
            Automate your email marketing with targeted sequences
          </p>
        </div>
        <div className="flex gap-2">
          <ManageSequenceProcessingButton />
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Sequence
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Sequences</CardTitle>
          <CardDescription>
            Manage your automated email sequences
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Loading sequences...</p>
            </div>
          ) : sequences.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sequences found</p>
              <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Create Sequence
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sequence Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sequences.map((sequence) => (
                    <TableRow key={sequence.id}>
                      <TableCell>
                        <div className="font-medium">{sequence.name}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {sequence.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sequence.triggerType === 'manual' ? (
                          <Badge variant="secondary">Manual</Badge>
                        ) : sequence.triggerType === 'event' ? (
                          <div className="flex items-center">
                            <Badge variant="outline" className="mr-1">Event</Badge>
                            <span className="text-muted-foreground">{sequence.triggerEvent}</span>
                          </div>
                        ) : (
                          <Badge variant="outline">Scheduled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {sequence.is_active ? (
                          <Badge variant="success" className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <CreatedAtCell sequence={sequence} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/email-sequence-details/${sequence.id}`)}
                          >
                            <ScrollText className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(sequence.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Email Sequence</DialogTitle>
            <DialogDescription>
              Define the sequence details to automate your email campaigns.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sequence Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Marketing Campaign" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief description of the sequence"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="triggerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a trigger type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="schedule">Schedule</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.getValues('triggerType') === 'event' && (
                <FormField
                  control={form.control}
                  name="triggerEvent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trigger Event</FormLabel>
                      <FormControl>
                        <Input placeholder="user.signed_up" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
