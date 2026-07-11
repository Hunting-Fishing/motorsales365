import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Ticket, User, Mail, Phone, DollarSign, Calendar, Plus, Search } from 'lucide-react';
import { TicketService } from '@/services/ticketService';
import { RaffleTicket, CreateTicketData, Raffle } from '@/types/raffle';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const ticketSchema = z.object({
  purchaser_name: z.string().min(1, 'Name is required'),
  purchaser_email: z.string().email('Valid email is required'),
  purchaser_phone: z.string().optional(),
  payment_method: z.string().optional(),
  amount_paid: z.number().min(0, 'Amount must be 0 or greater'),
  quantity: z.number().min(1, 'Must purchase at least 1 ticket').max(10, 'Maximum 10 tickets per purchase'),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface TicketSalesManagerProps {
  raffle: Raffle;
  onClose: () => void;
}

export function TicketSalesManager({ raffle, onClose }: TicketSalesManagerProps) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<RaffleTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      amount_paid: raffle.ticket_price,
      quantity: 1,
    },
  });

  useEffect(() => {
    loadTickets();
  }, [raffle.id]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const ticketsData = await TicketService.getTicketsByRaffle(raffle.id);
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTickets = async (data: TicketFormData) => {
    try {
      setSubmitting(true);
      const createData: CreateTicketData = {
        raffle_id: raffle.id,
        purchaser_name: data.purchaser_name,
        purchaser_email: data.purchaser_email,
        purchaser_phone: data.purchaser_phone,
        payment_method: data.payment_method,
        amount_paid: data.amount_paid,
        quantity: data.quantity,
      };
      
      await TicketService.createTickets(createData);
      toast({
        title: 'Success',
        description: `${data.quantity} ticket(s) created successfully`,
      });
      
      reset();
      setShowForm(false);
      loadTickets();
    } catch (error) {
      console.error('Error creating tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to create tickets',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.purchaser_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.purchaser_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = tickets.reduce((sum, ticket) => sum + ticket.amount_paid, 0);
  const paidTickets = tickets.filter(ticket => ticket.amount_paid > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ticket Sales</h2>
          <p className="text-muted-foreground">{raffle.title}</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
                <p className="text-2xl font-bold">{tickets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Paid Tickets</p>
                <p className="text-2xl font-bold">{paidTickets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg. Price</p>
                <p className="text-2xl font-bold">
                  ${paidTickets.length > 0 ? (totalRevenue / paidTickets.length).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Ticket Sale
        </Button>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Add Ticket Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Ticket Sale</CardTitle>
            <CardDescription>Record a new ticket purchase</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleCreateTickets)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaser_name">Purchaser Name *</Label>
                  <Input
                    id="purchaser_name"
                    {...register('purchaser_name')}
                    placeholder="Enter purchaser name"
                  />
                  {errors.purchaser_name && (
                    <p className="text-sm text-destructive mt-1">{errors.purchaser_name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="purchaser_email">Email *</Label>
                  <Input
                    id="purchaser_email"
                    type="email"
                    {...register('purchaser_email')}
                    placeholder="Enter email address"
                  />
                  {errors.purchaser_email && (
                    <p className="text-sm text-destructive mt-1">{errors.purchaser_email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="purchaser_phone">Phone</Label>
                  <Input
                    id="purchaser_phone"
                    {...register('purchaser_phone')}
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Input
                    id="payment_method"
                    {...register('payment_method')}
                    placeholder="Cash, Card, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="10"
                    {...register('quantity', { valueAsNumber: true })}
                  />
                  {errors.quantity && (
                    <p className="text-sm text-destructive mt-1">{errors.quantity.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="amount_paid">Amount Paid *</Label>
                  <Input
                    id="amount_paid"
                    type="number"
                    step="0.01"
                    {...register('amount_paid', { valueAsNumber: true })}
                  />
                  {errors.amount_paid && (
                    <p className="text-sm text-destructive mt-1">{errors.amount_paid.message}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Tickets'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket Sales ({filteredTickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-full mb-2"></div>
                </div>
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tickets found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No tickets match your search' : 'No tickets sold yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{ticket.ticket_number}</Badge>
                        {ticket.amount_paid > 0 ? (
                          <Badge>Paid</Badge>
                        ) : (
                          <Badge variant="secondary">Unpaid</Badge>
                        )}
                        {ticket.is_winner && <Badge className="bg-yellow-500">Winner</Badge>}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{ticket.purchaser_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{ticket.purchaser_email}</span>
                        </div>
                        {ticket.purchaser_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{ticket.purchaser_phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${ticket.amount_paid.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Purchased: {format(new Date(ticket.purchase_date), 'PPp')}
                        {ticket.payment_method && ` • Payment: ${ticket.payment_method}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}