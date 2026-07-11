
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DuplicateSearchOptions } from '@/utils/search/duplicateSearch';

interface DuplicateSearchConfigProps {
  options: DuplicateSearchOptions;
  onOptionsChange: (options: DuplicateSearchOptions) => void;
}

export const DuplicateSearchConfig: React.FC<DuplicateSearchConfigProps> = ({
  options,
  onOptionsChange
}) => {
  const handleOptionChange = (key: keyof DuplicateSearchOptions, value: any) => {
    onOptionsChange({
      ...options,
      [key]: value
    });
  };

  const handleMatchTypeChange = (matchType: string, enabled: boolean) => {
    const currentTypes = options.matchTypes || [];
    let newTypes;
    
    if (enabled) {
      newTypes = [...currentTypes, matchType];
    } else {
      newTypes = currentTypes.filter(type => type !== matchType);
    }
    
    handleOptionChange('matchTypes', newTypes);
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-medium mb-4">Search Configuration</h3>
        
        {/* Search Scope */}
        <div className="space-y-3">
          <Label>Search Scope</Label>
          <Select 
            value={options.searchScope} 
            onValueChange={(value) => handleOptionChange('searchScope', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select search scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="categories">Categories Only</SelectItem>
              <SelectItem value="subcategories">Subcategories Only</SelectItem>
              <SelectItem value="jobs">Jobs Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-4" />

        {/* Match Types */}
        <div className="space-y-3">
          <Label>Match Types</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="exact-match">Exact Match</Label>
              <Switch
                id="exact-match"
                checked={options.matchTypes?.includes('exact') || false}
                onCheckedChange={(checked) => handleMatchTypeChange('exact', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="exact-words">Exact Words</Label>
              <Switch
                id="exact-words"
                checked={options.matchTypes?.includes('exact_words') || false}
                onCheckedChange={(checked) => handleMatchTypeChange('exact_words', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="similar-match">Similar Match</Label>
              <Switch
                id="similar-match"
                checked={options.matchTypes?.includes('similar') || false}
                onCheckedChange={(checked) => handleMatchTypeChange('similar', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="partial-match">Partial Match</Label>
              <Switch
                id="partial-match"
                checked={options.matchTypes?.includes('partial') || false}
                onCheckedChange={(checked) => handleMatchTypeChange('partial', checked)}
              />
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Similarity Threshold */}
        <div className="space-y-3">
          <Label>Similarity Threshold: {options.similarityThreshold}%</Label>
          <Slider
            value={[options.similarityThreshold]}
            onValueChange={(value) => handleOptionChange('similarityThreshold', value[0])}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
        </div>

        <Separator className="my-4" />

        {/* Additional Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="ignore-case">Ignore Case</Label>
            <Switch
              id="ignore-case"
              checked={options.ignoreCase}
              onCheckedChange={(checked) => handleOptionChange('ignoreCase', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="ignore-punctuation">Ignore Punctuation</Label>
            <Switch
              id="ignore-punctuation"
              checked={options.ignorePunctuation}
              onCheckedChange={(checked) => handleOptionChange('ignorePunctuation', checked)}
            />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Word Length Filter */}
        <div className="space-y-3">
          <Label>Minimum Word Length: {options.minWordLength}</Label>
          <Slider
            value={[options.minWordLength]}
            onValueChange={(value) => handleOptionChange('minWordLength', value[0])}
            max={10}
            min={1}
            step={1}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};
