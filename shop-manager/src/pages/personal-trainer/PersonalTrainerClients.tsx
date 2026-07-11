import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Users, Plus, Search, Phone, Mail, Loader2, SlidersHorizontal, X } from 'lucide-react';
import ClientIntakeForm from '@/components/personal-trainer/ClientIntakeForm';
import { useNavigate } from 'react-router-dom';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const WORKOUT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function PersonalTrainerClients() {
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter states
  const [genderFilter, setGenderFilter] = useState('all');
  const [fitnessFilter, setFitnessFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState<string[]>([]);
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');




  const { data: trainers = [] } = useQuery({
    queryKey: ['pt-trainers-list', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_trainers').select('id, first_name, last_name').eq('shop_id', shopId).eq('is_active', true);
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['pt-clients', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await (supabase as any).from('pt_clients').select('*').eq('shop_id', shopId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });


  const addClient = useMutation({
    mutationFn: async (formPayload: Record<string, any>) => {
      if (!shopId) throw new Error('No shop');
      const { error } = await (supabase as any).from('pt_clients').insert({
        shop_id: shopId,
        ...formPayload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-clients'] });
      toast({ title: 'Client added successfully' });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });


  const toggleDayFilter = (day: string) => {
    setDayFilter(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const activeFilterCount = [
    genderFilter !== 'all',
    fitnessFilter !== 'all',
    statusFilter !== 'all',
    membershipFilter !== 'all',
    dayFilter.length > 0,
    trainerFilter !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setGenderFilter('all');
    setFitnessFilter('all');
    setStatusFilter('all');
    setMembershipFilter('all');
    setDayFilter([]);
    setTrainerFilter('all');
    setSortBy('newest');
  };

  const filtered = useMemo(() => {
    let result = clients.filter((c: any) => {
      const matchesSearch = `${c.first_name} ${c.last_name} ${c.email || ''}`.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (genderFilter !== 'all' && c.gender !== genderFilter) return false;
      if (fitnessFilter !== 'all' && c.fitness_level !== fitnessFilter) return false;
      if (statusFilter !== 'all' && c.membership_status !== statusFilter) return false;
      if (membershipFilter !== 'all' && c.membership_type !== membershipFilter) return false;
      if (trainerFilter !== 'all' && c.trainer_id !== trainerFilter) return false;
      if (dayFilter.length > 0) {
        const clientDays: string[] = c.preferred_workout_days || [];
        if (!dayFilter.some(d => clientDays.includes(d))) return false;
      }
      return true;
    });

    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'name-asc':
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        case 'name-desc':
          return `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`);
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'fitness': {
          const order: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
          return (order[a.fitness_level] ?? 0) - (order[b.fitness_level] ?? 0);
        }
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [clients, search, genderFilter, fitnessFilter, statusFilter, membershipFilter, trainerFilter, dayFilter, sortBy]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground text-sm">Manage your gym members and PT clients</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
              <Plus className="h-4 w-4 mr-2" />Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
            <ClientIntakeForm
              trainers={trainers}
              isPending={addClient.isPending}
              onSubmit={(payload) => addClient.mutate(payload)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search + Filter Toggle + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button
          variant={filtersOpen ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="name-asc">Name A–Z</SelectItem>
            <SelectItem value="name-desc">Name Z–A</SelectItem>
            <SelectItem value="fitness">Fitness Level</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Collapsible Filter Bar */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Filter Clients</p>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1 text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />Clear All
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Gender</Label>
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fitness Level</Label>
                  <Select value={fitnessFilter} onValueChange={setFitnessFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="frozen">Frozen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Membership</Label>
                  <Select value={membershipFilter} onValueChange={setMembershipFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {trainers.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Trainer</Label>
                    <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Trainers</SelectItem>
                        {trainers.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Preferred Days</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {WORKOUT_DAYS.map(day => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={dayFilter.includes(day) ? 'default' : 'outline'}
                      className="text-xs h-7 px-3"
                      onClick={() => toggleDayFilter(day)}
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Results count */}
      {(activeFilterCount > 0 || search) && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {clients.length} clients
        </p>
      )}

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>{activeFilterCount > 0 ? 'No clients match your filters.' : 'No clients yet. Add your first client!'}</p></CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client: any) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/personal-trainer/clients/${client.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{client.first_name} {client.last_name}</h3>
                    <Badge variant="secondary" className="mt-1 text-xs">{client.fitness_level}</Badge>
                  </div>
                  <Badge variant={client.membership_status === 'active' ? 'default' : 'destructive'}>{client.membership_status}</Badge>
                </div>
                {client.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</p>}
                {client.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone className="h-3 w-3" />{client.phone}</p>}
                {client.goals && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{client.goals}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}