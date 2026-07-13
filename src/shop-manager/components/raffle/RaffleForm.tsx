import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, DollarSign, Ticket } from 'lucide-react';
import { CreateRaffleData, UpdateRaffleData, Raffle } from '@/types/raffle';

const raffleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  ticket_price: z.number().min(0.01, 'Ticket price must be greater than 0'),
  max_tickets: z.number().min(1, 'Must have at least 1 ticket').optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  draw_date: z.string().optional(),
  terms_conditions: z.string().optional(),
});

type RaffleFormData = z.infer<typeof raffleSchema>;

interface RaffleFormProps {
  raffle?: Raffle;
  onSubmit: (data: CreateRaffleData | UpdateRaffleData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RaffleForm({ raffle, onSubmit, onCancel, isLoading }: RaffleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RaffleFormData>({
    resolver: zodResolver(raffleSchema),
    defaultValues: raffle ? {
      title: raffle.title,
      description: raffle.description || '',
      ticket_price: raffle.ticket_price,
      max_tickets: raffle.max_tickets || 100,
      start_date: raffle.start_date ? new Date(raffle.start_date).toISOString().split('T')[0] : '',
      end_date: raffle.end_date ? new Date(raffle.end_date).toISOString().split('T')[0] : '',
      draw_date: raffle.draw_date ? new Date(raffle.draw_date).toISOString().split('T')[0] : '',
      terms_conditions: raffle.terms_conditions || '',
    } : {
      ticket_price: 5,
      max_tickets: 100,
    },
  });

  const handleFormSubmit = async (data: RaffleFormData) => {
    try {
      const submitData = {
        ...data,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        draw_date: data.draw_date ? new Date(data.draw_date).toISOString() : undefined,
      };
      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting raffle:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          {raffle ? 'Edit Raffle' : 'Create New Raffle'}
        </CardTitle>
        <CardDescription>
          {raffle ? 'Update raffle details and settings' : 'Set up a new raffle for your community'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Raffle Title *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter raffle title"
                className="mt-1"
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe the prize and raffle details"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          {/* Pricing and Tickets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ticket_price" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Ticket Price *
              </Label>
              <Input
                id="ticket_price"
                type="number"
                step="0.01"
                {...register('ticket_price', { valueAsNumber: true })}
                placeholder="5.00"
                className="mt-1"
              />
              {errors.ticket_price && (
                <p className="text-sm text-destructive mt-1">{errors.ticket_price.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="max_tickets">Maximum Tickets</Label>
              <Input
                id="max_tickets"
                type="number"
                {...register('max_tickets', { valueAsNumber: true })}
                placeholder="100"
                className="mt-1"
              />
              {errors.max_tickets && (
                <p className="text-sm text-destructive mt-1">{errors.max_tickets.message}</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Schedule
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                  className="mt-1"
                />
                {errors.start_date && (
                  <p className="text-sm text-destructive mt-1">{errors.start_date.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date')}
                  className="mt-1"
                />
                {errors.end_date && (
                  <p className="text-sm text-destructive mt-1">{errors.end_date.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="draw_date">Draw Date</Label>
                <Input
                  id="draw_date"
                  type="date"
                  {...register('draw_date')}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div>
            <Label htmlFor="terms_conditions">Terms and Conditions</Label>
            <Textarea
              id="terms_conditions"
              {...register('terms_conditions')}
              placeholder="Enter terms and conditions for this raffle"
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : raffle ? 'Update Raffle' : 'Create Raffle'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}