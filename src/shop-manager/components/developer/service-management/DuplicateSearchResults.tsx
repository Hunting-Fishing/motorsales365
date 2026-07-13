
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, AlertTriangle, Info } from 'lucide-react';
import { DuplicateItem, DuplicateSearchOptions } from '@/utils/search/duplicateSearch';

interface DuplicateSearchResultsProps {
  duplicates: DuplicateItem[];
  recommendations: string[];
  searchOptions: DuplicateSearchOptions;
  onClose: () => void;
  onRemoveDuplicate: (itemId: string, type: 'category' | 'subcategory' | 'job') => Promise<void>;
}

export const DuplicateSearchResults: React.FC<DuplicateSearchResultsProps> = ({
  duplicates,
  recommendations,
  searchOptions,
  onClose,
  onRemoveDuplicate
}) => {
  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'exact_words':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'similar':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'partial':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getMatchTypeIcon = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return <AlertTriangle className="h-4 w-4" />;
      case 'exact_words':
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Duplicate Search Results</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="max-h-[70vh] overflow-y-auto">
        {duplicates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No duplicates found with current search criteria.</p>
            <p className="text-sm text-gray-400 mt-2">
              Try adjusting the similarity threshold or enabling more match types.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Search Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total duplicates found:</span>
                  <span className="ml-2 font-medium">{duplicates.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Similarity threshold:</span>
                  <span className="ml-2 font-medium">{searchOptions.similarityThreshold}%</span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Recommendations</h3>
                <ul className="text-sm space-y-1">
                  {recommendations.map((rec, index) => (
                    <li key={index} className="text-yellow-800">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Duplicate Groups */}
            <div className="space-y-4">
              <h3 className="font-medium">Duplicate Groups</h3>
              {duplicates.map((duplicate, index) => (
                <Card key={index} className="border-l-4 border-l-red-400">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getMatchTypeIcon(duplicate.matchType)}
                        <Badge className={getMatchTypeColor(duplicate.matchType)}>
                          {duplicate.matchType.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          Similarity: {duplicate.similarity}%
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {duplicate.occurrences.map((occurrence, occIndex) => (
                        <div key={occIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium">{occurrence.name}</div>
                            <div className="text-sm text-gray-600">
                              Type: {occurrence.type} | ID: {occurrence.itemId}
                            </div>
                            <div className="text-sm text-gray-500">
                              Path: {occurrence.path}
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onRemoveDuplicate(occurrence.itemId, occurrence.type as 'category' | 'subcategory' | 'job')}
                            className="gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
