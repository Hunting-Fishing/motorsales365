import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  advice: string;
}

export default function AiAdviceCard({ advice }: Props) {
  if (!advice) return null;
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />AI Nutrition Advice</CardTitle></CardHeader>
      <CardContent><div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{advice}</ReactMarkdown></div></CardContent>
    </Card>
  );
}
