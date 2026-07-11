import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddGymStaffDialog } from '@/components/personal-trainer/business/AddGymStaffDialog';
import { Plus, Search, UserCog, Mail, Phone, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const ROLE_COLORS: Record<string, string> = {
  front_desk: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  manager: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  cleaner: 'bg-green-500/20 text-green-400 border-green-500/30',
  maintenance: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  staff: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const ROLE_LABELS: Record<string, string> = {
  front_desk: 'Front Desk',
  manager: 'Manager',
  cleaner: 'Cleaner',
  maintenance: 'Maintenance',
  staff: 'General Staff',
};

export default function PersonalTrainerGymStaff() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: staff, isLoading } = useQuery({
    queryKey: ['pt-gym-staff', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('pt_gym_staff')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!shopId,
  });

  const filtered = staff?.filter(s => {
    const matchesSearch = !search || 
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  }) ?? [];

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('pt_gym_staff').delete().eq('id', deleteId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Staff member removed' }); queryClient.invalidateQueries({ queryKey: ['pt-gym-staff'] }); }
    setDeleteId(null);
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['pt-gym-staff'] });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gym Staff</h1>
          <p className="text-sm text-muted-foreground">Manage your gym employees and their roles</p>
        </div>
        <Button onClick={() => { setEditingStaff(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="front_desk">Front Desk</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="cleaner">Cleaner</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="staff">General Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading staff...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <UserCog className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No staff members</h3>
          <p className="text-sm text-muted-foreground mt-1">Add your first gym staff member to get started</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(member => (
            <Card key={member.id} className="relative group hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                      {member.first_name[0]}{member.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{member.first_name} {member.last_name}</h3>
                      <Badge variant="outline" className={`text-xs ${ROLE_COLORS[member.role] || ROLE_COLORS.staff}`}>
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingStaff(member); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteId(member.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {member.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{member.email}</div>}
                  {member.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{member.phone}</div>}
                  {member.department && <div className="text-xs">Dept: {member.department}</div>}
                  {member.hourly_rate > 0 && <div className="text-xs">${Number(member.hourly_rate).toFixed(2)}/hr</div>}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-muted-foreground">{member.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddGymStaffDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={refresh} editingStaff={editingStaff} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete staff member?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
