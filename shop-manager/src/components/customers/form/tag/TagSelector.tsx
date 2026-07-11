
import React from "react";
import { TagBadge } from "./TagBadge";
import { TagSuggestions } from "./TagSuggestions";
import { Input } from "@/components/ui/input";
import { useTagSelector } from "./useTagSelector.tsx";
import { Loader2 } from "lucide-react";

export interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags = [],
  onChange,
  disabled = false
}) => {
  const {
    inputValue,
    showSuggestions,
    handleInputChange,
    handleInputFocus,
    handleAddTag,
    handleRemoveTag,
    handleKeyDown,
    inputRef,
    suggestionsRef,
    loading
  } = useTagSelector(selectedTags, onChange);

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-background min-h-10 mb-1">
        {selectedTags.map((tag) => (
          <TagBadge
            key={tag}
            tag={tag}
            onRemove={handleRemoveTag}
            disabled={disabled}
          />
        ))}
        
        {!disabled && (
          <div className="flex-1 min-w-[120px]">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              className="border-none shadow-none h-8 p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={loading ? "Loading tags..." : "Type to add tags..."}
              disabled={loading}
            />
            {loading && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
      
      {showSuggestions && !disabled && !loading && (
        <TagSuggestions
          onSelectTag={handleAddTag}
          selectedTags={selectedTags}
        />
      )}
    </div>
  );
};
