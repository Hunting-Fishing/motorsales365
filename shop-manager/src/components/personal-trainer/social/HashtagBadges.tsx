import React from 'react';
import { Badge } from '@/components/ui/badge';

const SUGGESTED_TAGS = [
  '#BrokeMyRecord', '#OneLbAtATime', '#WellDoneJob', '#MeetingMyGoals',
  '#GoalReached', '#NewPR', '#FitnessJourney', '#Transformation',
  '#NeverGiveUp', '#StrongerEveryDay',
];

interface HashtagBadgesProps {
  tags: string[];
  onToggle?: (tag: string) => void;
  editable?: boolean;
}

export function HashtagBadges({ tags, onToggle, editable = false }: HashtagBadgesProps) {
  if (editable) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_TAGS.map((tag) => {
          const isSelected = tags.includes(tag);
          return (
            <Badge
              key={tag}
              variant={isSelected ? 'default' : 'outline'}
              className={`cursor-pointer text-xs transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent'
                  : 'hover:bg-orange-500/10 hover:border-orange-500/50'
              }`}
              onClick={() => onToggle?.(tag)}
            >
              {tag}
            </Badge>
          );
        })}
      </div>
    );
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag} className="text-xs text-orange-500 font-medium">
          {tag}
        </span>
      ))}
    </div>
  );
}
