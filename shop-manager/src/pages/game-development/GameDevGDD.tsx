import { useState, useCallback } from 'react';
import { useGameDevStore } from '@/stores/game-dev-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import {
  FileText, ChevronDown, ChevronRight, Plus, Trash2, Pencil,
  Download, Check, X, Sparkles,
} from 'lucide-react';
import type { GDDSection } from '@/types/game-development';
import ReactMarkdown from 'react-markdown';

const SECTION_TEMPLATES: Record<string, { prompt: string }> = {
  'Game Overview': { prompt: 'Summarize your game in 2-3 paragraphs.' },
  'Vision & Player Fantasy': { prompt: 'What does the player feel while playing?' },
  'Core Loop': { prompt: 'Describe the minute-to-minute, session, and meta loops.' },
  'Feature List': { prompt: 'List all planned features by priority.' },
  'Progression Systems': { prompt: 'How does the player grow?' },
  'Art Direction': { prompt: 'Describe the visual style and references.' },
  'Monetization Concept': { prompt: 'How does the game make money?' },
  'Narrative & World': { prompt: 'Outline the story, world lore, and characters.' },
  'Technical Considerations': { prompt: 'Engine, platforms, performance targets.' },
  'Production Risks': { prompt: 'What could go wrong and how to mitigate?' },
  'Milestone Roadmap': { prompt: 'Break production into phases with deliverables.' },
};

export default function GameDevGDD() {
  const { activeProjectId, projects } = useGameDevStore();
  const project = projects.find(p => p.id === activeProjectId);

  const [sections, setSections] = useState<(GDDSection & { id: string })[]>(() =>
    Object.keys(SECTION_TEMPLATES).map((title, i) => ({
      id: `gdd-${i}`,
      title,
      content: '',
      order: i,
    }))
  );
  const [expandedSection, setExpandedSection] = useState<string | null>(sections[0]?.id ?? null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  const filledCount = sections.filter(s => s.content.length > 0).length;
  const completionPct = sections.length > 0 ? Math.round((filledCount / sections.length) * 100) : 0;

  const toggleSection = (id: string) => {
    setExpandedSection(prev => prev === id ? null : id);
  };

  const updateContent = (id: string, content: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, content } : s));
  };

  const addSection = () => {
    const newSection = {
      id: `gdd-${Date.now()}`,
      title: 'New Section',
      content: '',
      order: sections.length,
    };
    setSections(prev => [...prev, newSection]);
    setExpandedSection(newSection.id);
  };

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const startEditTitle = (id: string, currentTitle: string) => {
    setEditingTitle(id);
    setEditTitleValue(currentTitle);
  };

  const saveTitle = () => {
    if (editingTitle && editTitleValue.trim()) {
      setSections(prev => prev.map(s => s.id === editingTitle ? { ...s, title: editTitleValue.trim() } : s));
    }
    setEditingTitle(null);
  };

  const exportMarkdown = () => {
    const title = project?.name || 'Game Design Document';
    const md = `# ${title} — Game Design Document\n\n` +
      sections.map(s => `## ${s.title}\n\n${s.content || '*No content yet*'}\n`).join('\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-gdd.md`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 p-6 animate-fade-in">
        <div className="p-4 rounded-full bg-primary/10"><Sparkles className="h-10 w-10 text-primary" /></div>
        <p className="text-muted-foreground">Select a project to build its Game Design Document</p>
        <GameDevProjectSelector />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> GDD Builder
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {project?.name} — {filledCount}/{sections.length} sections filled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportMarkdown}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={addSection}>
            <Plus className="h-3.5 w-3.5" /> Section
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Document Completion</span>
          <span>{completionPct}%</span>
        </div>
        <Progress value={completionPct} className="h-2" />
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {sections.map(section => {
          const isExpanded = expandedSection === section.id;
          const template = SECTION_TEMPLATES[section.title];

          return (
            <Card key={section.id} className="overflow-hidden">
              <div
                className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                {editingTitle === section.id ? (
                  <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                    <Input className="h-7 text-sm" value={editTitleValue} onChange={e => setEditTitleValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(null); }}
                      autoFocus />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveTitle}><Check className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingTitle(null)}><X className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <span className="flex-1 font-medium text-sm">{section.title}</span>
                )}
                {section.content ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">Filled</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Empty</Badge>
                )}
                <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEditTitle(section.id, section.title)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeSection(section.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0 space-y-3">
                  {template && (
                    <p className="text-xs text-muted-foreground italic">{template.prompt}</p>
                  )}
                  <Textarea
                    className="min-h-[200px] text-sm font-mono"
                    placeholder="Write your section content in Markdown..."
                    value={section.content}
                    onChange={e => updateContent(section.id, e.target.value)}
                  />
                  {section.content && (
                    <>
                      <Separator />
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
