import { useState } from 'react';
import { useGameDevStore } from '@/stores/game-dev-store';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Globe, Languages, Download } from 'lucide-react';

const COMMON_LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh', 'pt', 'it', 'ru', 'ar', 'hi'];

export default function GameDevLocalization() {
  const { localeStrings, addLocaleString, updateLocaleString, removeLocaleString, activeProjectId } = useGameDevStore();
  const [search, setSearch] = useState('');
  const [localeFilter, setLocaleFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ string_key: '', locale: 'en', value: '', context: '' });

  const projectStrings = localeStrings.filter(s => s.project_id === activeProjectId);
  const uniqueLocales = [...new Set(projectStrings.map(s => s.locale))];
  const uniqueKeys = [...new Set(projectStrings.map(s => s.string_key))];

  const filtered = projectStrings
    .filter(s => localeFilter === 'all' || s.locale === localeFilter)
    .filter(s => !search || s.string_key.toLowerCase().includes(search.toLowerCase()) || s.value.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = () => {
    if (!form.string_key.trim() || !form.value.trim() || !activeProjectId) return;
    addLocaleString({
      project_id: activeProjectId,
      string_key: form.string_key,
      locale: form.locale,
      value: form.value,
      context: form.context || undefined,
    });
    setForm({ string_key: '', locale: form.locale, value: '', context: '' });
    setDialogOpen(false);
  };

  const exportJson = () => {
    const grouped: Record<string, Record<string, string>> = {};
    projectStrings.forEach(s => {
      if (!grouped[s.locale]) grouped[s.locale] = {};
      grouped[s.locale][s.string_key] = s.value;
    });
    const blob = new Blob([JSON.stringify(grouped, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'localization.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Select a project to manage localization.</CardContent></Card>
      </div>
    );
  }

  const coverage = uniqueLocales.map(locale => ({
    locale,
    count: projectStrings.filter(s => s.locale === locale).length,
    percentage: uniqueKeys.length > 0 ? Math.round((projectStrings.filter(s => s.locale === locale).length / uniqueKeys.length) * 100) : 0,
  }));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-6 w-6 text-primary" /> Localization</h1>
          <p className="text-sm text-muted-foreground">{uniqueKeys.length} keys · {uniqueLocales.length} locales · {projectStrings.length} translations</p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
          <Button variant="outline" size="sm" onClick={exportJson}><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add String</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Locale String</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Key (e.g. ui.menu.play)" value={form.string_key} onChange={e => setForm(f => ({ ...f, string_key: e.target.value }))} />
                <Select value={form.locale} onValueChange={v => setForm(f => ({ ...f, locale: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COMMON_LOCALES.map(l => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
                <Textarea placeholder="Translated value" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
                <Input placeholder="Context hint (optional)" value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} />
                <Button onClick={handleAdd} className="w-full">Add Translation</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {coverage.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {coverage.map(c => (
            <Card key={c.locale} className="text-center p-2">
              <p className="text-lg font-bold">{c.locale.toUpperCase()}</p>
              <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${c.percentage}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{c.count}/{uniqueKeys.length} ({c.percentage}%)</p>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search keys or values..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={localeFilter} onValueChange={setLocaleFilter}>
          <SelectTrigger className="w-[120px]"><Languages className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {uniqueLocales.map(l => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No strings found.</CardContent></Card>
        ) : filtered.map(s => (
          <Card key={s.id} className="hover:bg-accent/30 transition-colors">
            <CardContent className="p-2 flex items-center gap-3">
              <Badge variant="outline" className="text-xs font-mono">{s.locale.toUpperCase()}</Badge>
              <code className="text-xs text-muted-foreground flex-shrink-0 max-w-[200px] truncate">{s.string_key}</code>
              <p className="text-sm flex-1 truncate">{s.value}</p>
              {s.context && <span className="text-xs text-muted-foreground italic hidden md:block">{s.context}</span>}
              <Button variant="ghost" size="sm" className="text-destructive h-6 w-6 p-0" onClick={() => removeLocaleString(s.id)}>×</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
