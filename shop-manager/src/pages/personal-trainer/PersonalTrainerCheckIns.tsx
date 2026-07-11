import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardCheck, MessageSquare, Loader2, Star, Moon, Zap, Brain, Sparkles } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

export default function PersonalTrainerCheckIns() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [aiSummary, setAiSummary] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ['pt-check-ins', shopId, statusFilter],
    queryFn: async () => {
      if (!shopId) return [];
      let query = (supabase as any).from('pt_check_ins')
        .select('*, pt_clients(first_name, last_name), pt_trainers(first_name, last_name)')
        .eq('shop_id', shopId)
        .order('check_in_date', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const updateFeedback = useMutation({
    mutationFn: async ({ id, feedback, status }: { id: string; feedback: string; status: string }) => {
      const { error } = await (supabase as any).from('pt_check_ins').update({ trainer_feedback: feedback, status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-check-ins'] });
      toast({ title: 'Feedback saved' });
    },
  });

  const generateAiSummary = async (clientId: string) => {
    setAiLoading(clientId);
    try {
      const { data, error } = await supabase.functions.invoke('pt-ai-assistant', {
        body: { action: 'summarize_checkins', clientId, shopId },
      });
      if (error) throw error;
      setAiSummary(prev => ({ ...prev, [clientId]: data.content }));
    } catch (e: any) {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    } finally {
      setAiLoading(null);
    }
  };

  const moodIcons: Record<string, React.ReactNode> = {
    great: <Star className="h-4 w-4 text-yellow-500" />,
    good: <Zap className="h-4 w-4 text-green-500" />,
    okay: <Brain className="h-4 w-4 text-blue-500" />,
    tired: <Moon className="h-4 w-4 text-purple-500" />,
    stressed: <Brain className="h-4 w-4 text-red-500" />,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Client Check-Ins</h1>
          <p className="text-muted-foreground text-sm">Review and respond to weekly client check-ins</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
      ) : checkIns.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No check-ins yet</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {checkIns.map((ci: any) => (
            <Card key={ci.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {ci.pt_clients?.first_name} {ci.pt_clients?.last_name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{format(new Date(ci.check_in_date), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          disabled={aiLoading === ci.client_id}
                          onClick={() => generateAiSummary(ci.client_id)}
                        >
                          {aiLoading === ci.client_id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                          AI Summary
                        </Button>
                        <Badge variant={ci.status === 'reviewed' ? 'default' : 'secondary'}>{ci.status}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {ci.weight_kg && (
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Weight</p>
                          <p className="font-semibold text-sm">{ci.weight_kg} kg</p>
                        </div>
                      )}
                      {ci.mood && (
                        <div className="p-2 rounded-lg bg-muted/50 flex items-center gap-2">
                          {moodIcons[ci.mood] || null}
                          <div>
                            <p className="text-xs text-muted-foreground">Mood</p>
                            <p className="font-semibold text-sm capitalize">{ci.mood}</p>
                          </div>
                        </div>
                      )}
                      {ci.sleep_hours && (
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Sleep</p>
                          <p className="font-semibold text-sm">{ci.sleep_hours}h</p>
                        </div>
                      )}
                      {ci.energy_level && (
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Energy</p>
                          <p className="font-semibold text-sm">{ci.energy_level}/10</p>
                        </div>
                      )}
                      {ci.workout_compliance && (
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Workout</p>
                          <p className="font-semibold text-sm">{ci.workout_compliance}/10</p>
                        </div>
                      )}
                      {ci.soreness_level && (
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Soreness</p>
                          <p className="font-semibold text-sm">{ci.soreness_level}/10</p>
                        </div>
                      )}
                    </div>

                    {ci.notes && <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">{ci.notes}</p>}

                    {/* AI Summary */}
                    {aiSummary[ci.client_id] && (
                      <div className="bg-violet-50 dark:bg-violet-950/20 p-3 rounded-lg border border-violet-200 dark:border-violet-800">
                        <p className="text-xs font-medium text-violet-600 mb-2 flex items-center gap-1"><Sparkles className="h-3 w-3" />AI Check-In Summary</p>
                        <div className="prose prose-sm max-w-none text-sm"><ReactMarkdown>{aiSummary[ci.client_id]}</ReactMarkdown></div>
                      </div>
                    )}

                    {ci.trainer_feedback && (
                      <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                        <p className="text-xs font-medium text-orange-600 mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" />Trainer Feedback</p>
                        <p className="text-sm">{ci.trainer_feedback}</p>
                      </div>
                    )}
                  </div>

                  {ci.status !== 'reviewed' && (
                    <div className="min-w-[200px] space-y-2">
                      <Textarea
                        placeholder="Add feedback..."
                        className="text-sm"
                        id={`feedback-${ci.id}`}
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const el = document.getElementById(`feedback-${ci.id}`) as HTMLTextAreaElement;
                          updateFeedback.mutate({ id: ci.id, feedback: el?.value || '', status: 'reviewed' });
                        }}
                      >
                        Submit Feedback
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
