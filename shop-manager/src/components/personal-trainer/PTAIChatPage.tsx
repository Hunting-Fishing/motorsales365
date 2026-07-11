import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Trash2, Sparkles, User, Loader2, ChefHat, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useShopId } from '@/hooks/useShopId';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };
type ChatMode = 'coach' | 'chef';

const COACH_PROMPTS = [
  { label: '🍗 Meal plan for today', prompt: 'Create a meal plan for today based on my goals and training schedule' },
  { label: '💪 Post-workout meal', prompt: 'What should I eat after my workout today for optimal recovery?' },
  { label: '🥗 Meal prep ideas', prompt: 'Give me 5 easy meal prep ideas for the week that fit my nutrition goals' },
  { label: '📊 Review my nutrition', prompt: 'Analyze my recent food logs and tell me how I\'m doing against my goals' },
  { label: '🏋️ Training advice', prompt: 'Based on my fitness profile, suggest improvements to my training approach' },
  { label: '💊 Supplement check', prompt: 'Review my supplement stack and suggest any changes based on my goals' },
];

const CHEF_PROMPTS = [
  { label: '🍗 Prep chicken & rice', prompt: 'Walk me through prepping chicken and rice for the whole week — step by step like I\'m a beginner' },
  { label: '🐟 Cook salmon perfectly', prompt: 'How do I cook salmon perfectly? Give me timing, temperature, and seasoning tips' },
  { label: '📦 Batch cook ideas', prompt: 'Give me batch cooking ideas that fit my meal plan — things I can prep on Sunday for the week' },
  { label: '⏱️ Quick 15-min dinners', prompt: 'What are some quick 15-minute dinner ideas that are high protein and easy to make?' },
  { label: '🌿 Season veggies better', prompt: 'Help me season vegetables so they actually taste good — I\'m tired of bland broccoli' },
  { label: '🔪 Kitchen tools I need', prompt: 'What kitchen tools and equipment do I actually need for healthy meal prep?' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pt-ai-chat`;

export default function PTAIChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ChatMode>('coach');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { shopId } = useShopId();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const streamChat = async (allMessages: Msg[]) => {
    setIsStreaming(true);
    setError(null);

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          shopId,
          mode,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response stream');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantSoFar = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      console.error('Chat stream error:', e);
      setError(e.message || 'Failed to get AI response');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isStreaming) return;

    const userMsg: Msg = { role: 'user', content: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    await streamChat(newMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const isChef = mode === 'chef';
  const activePrompts = isChef ? CHEF_PROMPTS : COACH_PROMPTS;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl shadow-lg transition-colors duration-300",
            isChef
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
              : "bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/25"
          )}>
            {isChef ? <ChefHat className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-white" />}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {isChef ? 'FitChef AI' : 'FitCoach AI'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isChef ? 'Cooking • Meal Prep • Kitchen Tips' : 'Nutrition • Training • Meal Prep'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setMode('coach')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                !isChef
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Dumbbell className="h-3.5 w-3.5" />
              Coach
            </button>
            <button
              onClick={() => setMode('chef')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                isChef
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ChefHat className="h-3.5 w-3.5" />
              Chef
            </button>
          </div>

          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 space-y-8">
            <div className="text-center space-y-3">
              <div className={cn(
                "mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl transition-colors duration-300",
                isChef
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
                  : "bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/25"
              )}>
                {isChef ? <ChefHat className="h-8 w-8 text-white" /> : <Sparkles className="h-8 w-8 text-white" />}
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {isChef ? "Let's get cooking! 👨‍🍳" : 'What can I help with?'}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md">
                {isChef
                  ? "I'm your personal kitchen buddy. Ask me how to cook anything, prep meals for the week, or level up your seasoning game."
                  : 'Ask me about nutrition, meal plans, workout advice, supplements, recovery — anything fitness related.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {activePrompts.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => handleSend(qp.prompt)}
                  className={cn(
                    "text-left px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all text-sm text-foreground group",
                    isChef ? "hover:bg-emerald-500/5" : "hover:bg-accent/50"
                  )}
                >
                  <span className="group-hover:text-primary transition-colors">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 mt-1">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isChef
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                        : "bg-gradient-to-br from-orange-500 to-red-600"
                    )}>
                      {isChef ? <ChefHat className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                    </div>
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 max-w-[85%] sm:max-w-[75%]',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-card border border-border rounded-bl-md'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  isChef
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                    : "bg-gradient-to-br from-orange-500 to-red-600"
                )}>
                  {isChef ? <ChefHat className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-xl px-4 py-3 text-sm max-w-md">
                  {error}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={isChef ? "Ask me how to cook anything..." : "Ask about nutrition, training, meal prep..."}
            className="min-h-[44px] max-h-[120px] resize-none rounded-xl border-border bg-background"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className={cn(
              "h-11 w-11 rounded-xl text-white shadow-lg flex-shrink-0 transition-colors duration-300",
              isChef
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25"
                : "bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-500/25"
            )}
          >
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          {isChef
            ? "FitChef AI adapts to your dietary needs, allergies & cooking level"
            : "FitCoach AI uses your profile, goals & logs for personalized advice"}
        </p>
      </div>
    </div>
  );
}
