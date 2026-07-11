
import React from 'react';
import { TagInput } from '@/components/customers/documents/TagInput';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
  suggestedTags?: string[];
  className?: string;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onChange,
  placeholder = "Add tags...",
  label,
  suggestedTags = [],
  className
}) => {
  // Suggested tags that aren't already selected
  const availableSuggestions = suggestedTags.filter(tag => !selectedTags.includes(tag));

  const handleAddSuggestedTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <TagInput 
        value={selectedTags} 
        onChange={onChange} 
        placeholder={placeholder}
        className="min-h-10"
      />
      
      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {availableSuggestions.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => handleAddSuggestedTag(tag)}
              className="px-2.5 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagSelector;
