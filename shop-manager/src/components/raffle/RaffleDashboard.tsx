import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, Trophy, Users, DollarSign, Calendar, Clock, Eye, Gift, Plus } from 'lucide-react';
import { RaffleService } from '@/services/raffleService';
import { Raffle, RaffleStats } from '@/types/raffle';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface RaffleDashboardProps {
  onCreateRaffle: () => void;
  onEditRaffle: (raffle: Raffle) => void;
  onViewTickets: (raffle: Raffle) => void;
}

export function RaffleDashboard({ onCreateRaffle, onEditRaffle, onViewTickets }: RaffleDashboardProps) {
  const { toast } = useToast();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [stats, setStats] = useState<RaffleStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rafflesData, statsData] = await Promise.all([
        RaffleService.getRaffles(),
        RaffleService.getRaffleStats()
      ]);
      setRaffles(rafflesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading raffle data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load raffle data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const launchRaffle = async (raffle: Raffle) => {
    try {
      await RaffleService.updateRaffle(raffle.id, { status: 'active' });
      toast({
        title: 'Raffle Launched',
        description: `"${raffle.title}" is now active and accepting ticket sales.`,
      });
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error launching raffle:', error);
      toast({
        title: 'Error',
        description: 'Failed to launch raffle. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge>Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    
    if (end < now) {
      return 'Ended';
    }
    
    return formatDistanceToNow(end, { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Raffles</CardTitle>
            <Ticket className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.activeRaffles || 0}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <Users className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.totalTicketsSold || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${stats?.totalRevenue?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Total revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Winners</CardTitle>
            <Trophy className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.totalWinners || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Raffles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Raffles</CardTitle>
              <CardDescription>Manage your raffles and track ticket sales</CardDescription>
            </div>
            <Button onClick={onCreateRaffle}>
              <Plus className="h-4 w-4 mr-2" />
              Create Raffle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {raffles.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No raffles yet</h3>
              <p className="text-muted-foreground mb-4">Create your first raffle to get started</p>
              <Button onClick={onCreateRaffle}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Raffle
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {raffles.map((raffle) => (
                <div key={raffle.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{raffle.title}</h4>
                      {raffle.description && (
                        <p className="text-sm text-muted-foreground">{raffle.description}</p>
                      )}
                    </div>
                    {getStatusBadge(raffle.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span>{raffle.tickets_sold} / {raffle.max_tickets || '∞'} tickets</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>${raffle.ticket_price} per ticket</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span>${(raffle.tickets_sold * raffle.ticket_price).toFixed(2)} raised</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {raffle.draw_date ? 
                          `Draw: ${format(new Date(raffle.draw_date), 'MMM dd')}` :
                          `End: ${format(new Date(raffle.end_date), 'MMM dd')}`
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{getTimeRemaining(raffle.end_date)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onViewTickets(raffle)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Tickets
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onEditRaffle(raffle)}>
                      Edit Raffle
                    </Button>
                    {raffle.status === 'draft' && (
                      <Button size="sm" onClick={() => launchRaffle(raffle)}>
                        Launch
                      </Button>
                    )}
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