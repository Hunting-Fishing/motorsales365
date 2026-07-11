import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useCreateProgram } from "@/services/nonprofitData";
import type { CreateProgramData } from "@/types/nonprofit";

const programSchema = z.object({
  name: z.string().min(1, "Program name is required"),
  description: z.string().optional(),
  program_type: z.enum(['education', 'health', 'environment', 'community', 'youth', 'seniors', 'other']),
  status: z.enum(['active', 'inactive', 'completed', 'planned']).default('active'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget_allocated: z.coerce.number().min(0).default(0),
  target_participants: z.coerce.number().min(0).default(0),
  location: z.string().optional(),
  grant_funded: z.boolean().default(false),
  funding_sources: z.string().optional(),
  success_metrics: z.string().optional(),
});

type ProgramFormData = z.infer<typeof programSchema>;

interface ProgramFormProps {
  onSuccess?: () => void;
}

export const ProgramForm: React.FC<ProgramFormProps> = ({ onSuccess }) => {
  const createProgram = useCreateProgram();

  const form = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      status: 'active',
      budget_allocated: 0,
      target_participants: 0,
      grant_funded: false,
    },
  });

  const onSubmit = async (data: ProgramFormData) => {
    const programData: CreateProgramData = {
      name: data.name,
      description: data.description,
      program_type: data.program_type,
      status: data.status,
      start_date: data.start_date,
      end_date: data.end_date,
      budget_allocated: data.budget_allocated,
      target_participants: data.target_participants,
      location: data.location,
      grant_funded: data.grant_funded,
      funding_sources: data.funding_sources ? data.funding_sources.split(',').map(s => s.trim()) : [],
      success_metrics: data.success_metrics ? data.success_metrics.split(',').map(s => s.trim()) : [],
    };

    createProgram.mutate(programData, {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      },
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create New Program</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter program name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="program_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select program type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="health">Health</SelectItem>
                        <SelectItem value="environment">Environment</SelectItem>
                        <SelectItem value="community">Community</SelectItem>
                        <SelectItem value="youth">Youth</SelectItem>
                        <SelectItem value="seniors">Seniors</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the program's goals and activities" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget_allocated"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Allocated ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Participants</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Program location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="grant_funded"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Grant Funded</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Is this program funded by grants?
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="funding_sources"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funding Sources (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Grant ABC, Private Donor, City Council" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="success_metrics"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Success Metrics (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Participants served, Skills learned, Community impact" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={createProgram.isPending}
            >
              {createProgram.isPending ? "Creating..." : "Create Program"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};