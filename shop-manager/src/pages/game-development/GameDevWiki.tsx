import { useState } from 'react';
import { useGameDevStore } from '@/stores/game-dev-store';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, BookOpen, Trash2, Search, Eye } from 'lucide-react';
import { WikiArticle, WikiCategory, WIKI_CATEGORY_CONFIG } from '@/types/game-development';

const CATEGORIES = Object.entries(WIKI_CATEGORY_CONFIG) as [WikiCategory, typeof WIKI_CATEGORY_CONFIG[WikiCategory]][];

export default function GameDevWiki() {
  const { activeProjectId, wikiArticles, addWikiArticle, removeWikiArticle } = useGameDevStore();
  const [showAdd, setShowAdd] = useState(false);
  const [viewArticle, setViewArticle] = useState<WikiArticle | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [form, setForm] = useState({ title: '', category: 'lore' as WikiCategory, content: '', tags: '' });

  const projectArticles = wikiArticles.filter(a => a.project_id === activeProjectId);
  const filtered = projectArticles.filter(a => {
    if (filterCat !== 'all' && a.category !== filterCat) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Select a project to manage your wiki.</CardContent></Card>
      </div>
    );
  }

  const handleAdd = () => {
    if (!form.title.trim()) return;
    addWikiArticle({
      project_id: activeProjectId,
      title: form.title,
      slug: form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      content: form.content,
      category: form.category,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
    setForm({ title: '', category: 'lore', content: '', tags: '' });
    setShowAdd(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Game Wiki</h1>
          <p className="text-sm text-muted-foreground">{projectArticles.length} articles</p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Article</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Wiki Article</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Article title" /></div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as WikiCategory }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Content (Markdown)</Label><Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write your article content..." rows={6} /></div>
                <div><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="lore, magic, history" /></div>
                <Button onClick={handleAdd} className="w-full">Create Article</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..." className="pl-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No wiki articles yet. Create your first article to start documenting your game world.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(article => {
            const catConfig = WIKI_CATEGORY_CONFIG[article.category];
            return (
              <Card key={article.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{catConfig.emoji}</span>
                      {article.title}
                    </CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewArticle(article)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeWikiArticle(article.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs w-fit">{catConfig.label}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{article.content || 'No content yet.'}</p>
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {article.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Article viewer */}
      <Dialog open={!!viewArticle} onOpenChange={() => setViewArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewArticle && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{WIKI_CATEGORY_CONFIG[viewArticle.category].emoji}</span>
                  {viewArticle.title}
                </DialogTitle>
              </DialogHeader>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {viewArticle.content || 'No content.'}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
