import { useState, useMemo } from 'react';
import { useGameDevStore } from '@/stores/game-dev-store';
import { NODE_TYPE_CONFIG, type NodeType, type PlanningStatus, type Priority } from '@/types/game-development';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import { Database, Plus, Search, Filter, Sparkles, ArrowUpDown, ArrowUp, ArrowDown, Download, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  'idea': 'bg-muted text-muted-foreground',
  'planned': 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-amber-500/20 text-amber-400',
  'review': 'bg-primary/20 text-primary',
  'done': 'bg-emerald-500/20 text-emerald-400',
  'blocked': 'bg-destructive/20 text-destructive',
  'backlog': 'bg-secondary text-secondary-foreground',
  'cut': 'bg-muted text-muted-foreground',
};

const priorityColors: Record<string, string> = {
  'critical': 'bg-destructive/20 text-destructive',
  'high': 'bg-amber-500/20 text-amber-400',
  'medium': 'bg-blue-500/20 text-blue-400',
  'low': 'bg-muted text-muted-foreground',
  'backlog': 'bg-secondary text-secondary-foreground',
};

const ALL_STATUSES: PlanningStatus[] = ['idea', 'planned', 'in-progress', 'review', 'done', 'blocked', 'backlog', 'cut'];
const ALL_PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low', 'backlog'];

type SortField = 'title' | 'record_type' | 'status' | 'priority' | 'owner';

export default function GameDevDatabase() {
  const { planningRecords, activeProjectId, addPlanningRecord, updatePlanningRecord, removePlanningRecord } = useGameDevStore();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [form, setForm] = useState({
    title: '', record_type: 'feature' as NodeType, summary: '',
    status: 'idea' as PlanningStatus, priority: 'medium' as Priority,
    tags: [] as string[], owner: '', notes: '',
  });

  const allProjectRecords = planningRecords.filter(r => r.project_id === activeProjectId);

  const filtered = useMemo(() => {
    let recs = allProjectRecords
      .filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.summary?.toLowerCase().includes(search.toLowerCase()))
      .filter(r => filterType === 'all' || r.record_type === filterType)
      .filter(r => filterStatus === 'all' || r.status === filterStatus);

    if (sortField) {
      recs = [...recs].sort((a, b) => {
        const av = (a[sortField] ?? '').toString().toLowerCase();
        const bv = (b[sortField] ?? '').toString().toLowerCase();
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return recs;
  }, [allProjectRecords, search, filterType, filterStatus, sortField, sortDir]);

  const handleCreate = () => {
    if (!activeProjectId || !form.title) return;
    addPlanningRecord({ ...form, project_id: activeProjectId });
    setOpen(false);
    setForm({ title: '', record_type: 'feature', summary: '', status: 'idea', priority: 'medium', tags: [], owner: '', notes: '' });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortField(null); setSortDir('asc'); }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(r => r.id)));
  };

  const bulkDelete = () => {
    selectedIds.forEach(id => removePlanningRecord(id));
    toast.success(`Deleted ${selectedIds.size} records`);
    setSelectedIds(new Set());
  };

  const exportCSV = () => {
    const headers = ['Title', 'Type', 'Status', 'Priority', 'Owner', 'Summary'];
    const rows = filtered.map(r => [r.title, r.record_type, r.status, r.priority, r.owner || '', (r.summary || '').replace(/"/g, '""')]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'planning-records.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 p-6 animate-fade-in">
        <div className="p-4 rounded-full bg-primary/10"><Sparkles className="h-10 w-10 text-primary" /></div>
        <p className="text-muted-foreground">Select a project to view its planning database</p>
        <GameDevProjectSelector />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Database className="h-6 md:h-7 w-6 md:w-7 text-primary" /> Planning Database
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} records</p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Record
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="h-8 pl-8 text-xs" placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(NODE_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedIds.size > 0 && (
          <Button size="sm" variant="destructive" className="gap-1 h-8 text-xs" onClick={bulkDelete}>
            <Trash2 className="h-3 w-3" /> Delete {selectedIds.size}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/50 text-left">
              <th className="px-2 py-2 w-8">
                <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
              </th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => toggleSort('title')}>
                <span className="flex items-center gap-1">Title {sortIcon('title')}</span>
              </th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => toggleSort('record_type')}>
                <span className="flex items-center gap-1">Type {sortIcon('record_type')}</span>
              </th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => toggleSort('status')}>
                <span className="flex items-center gap-1">Status {sortIcon('status')}</span>
              </th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => toggleSort('priority')}>
                <span className="flex items-center gap-1">Priority {sortIcon('priority')}</span>
              </th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => toggleSort('owner')}>
                <span className="flex items-center gap-1">Owner {sortIcon('owner')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                <td className="px-2 py-2 w-8"><Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></td>
                <td className="px-3 py-2">
                  <span className="text-sm font-medium truncate max-w-[200px] block">{r.title}</span>
                </td>
                <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{NODE_TYPE_CONFIG[r.record_type]?.label}</Badge></td>
                <td className="px-3 py-2">
                  <Select value={r.status} onValueChange={(v: PlanningStatus) => updatePlanningRecord(r.id, { status: v })}>
                    <SelectTrigger className="h-7 text-[10px] border-none bg-transparent p-0 w-auto gap-1">
                      <Badge className={`text-[10px] ${statusColors[r.status]}`}>{r.status}</Badge>
                    </SelectTrigger>
                    <SelectContent>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Select value={r.priority} onValueChange={(v: Priority) => updatePlanningRecord(r.id, { priority: v })}>
                    <SelectTrigger className="h-7 text-[10px] border-none bg-transparent p-0 w-auto gap-1">
                      <Badge className={`text-[10px] ${priorityColors[r.priority]}`}>{r.priority}</Badge>
                    </SelectTrigger>
                    <SelectContent>{ALL_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.owner || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Planning Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Summary" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.record_type} onValueChange={(v: NodeType) => setForm(f => ({ ...f, record_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(NODE_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.status} onValueChange={(v: PlanningStatus) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.priority} onValueChange={(v: Priority) => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Owner" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
            </div>
            <Button onClick={handleCreate} disabled={!form.title} className="w-full">Create Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
