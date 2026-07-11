import React from 'react';
import { cn } from '@/lib/utils';

const REACTIONS = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'muscle', emoji: '💪', label: 'Strong' },
  { type: 'heart', emoji: '❤️', label: 'Love' },
  { type: 'clap', emoji: '👏', label: 'Clap' },
  { type: 'star', emoji: '⭐', label: 'Star' },
];

interface ReactionCount {
  reaction_type: string;
  count: number;
  reacted_by_me: boolean;
}

interface ReactionBarProps {
  reactions: ReactionCount[];
  onReact: (type: string) => void;
  loading?: boolean;
}

export function ReactionBar({ reactions, onReact, loading }: ReactionBarProps) {
  const getReaction = (type: string) => reactions.find((r) => r.reaction_type === type);

  return (
    <div className="flex items-center gap-1">
      {REACTIONS.map((r) => {
        const data = getReaction(r.type);
        const count = data?.count || 0;
        const active = data?.reacted_by_me || false;

        return (
          <button
            key={r.type}
            disabled={loading}
            onClick={() => onReact(r.type)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all',
              active
                ? 'bg-orange-500/20 ring-1 ring-orange-500/50'
                : 'bg-muted hover:bg-muted/80'
            )}
            title={r.label}
          >
            <span className="text-sm">{r.emoji}</span>
            {count > 0 && <span className="font-medium text-foreground">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
