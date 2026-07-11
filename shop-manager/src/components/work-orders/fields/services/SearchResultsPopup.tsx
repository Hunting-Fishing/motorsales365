
import React from 'react';
import { Search, X } from 'lucide-react';
import { ServiceJob } from '@/types/service';
import { Card, CardContent } from '@/components/ui/card';

interface SearchResult {
  service: ServiceJob;
  sectorName: string;
  categoryName: string;
  subcategoryName: string;
  fullPath: string;
}

interface SearchResultsPopupProps {
  searchTerm: string;
  results: SearchResult[];
  isVisible: boolean;
  onSelectService: (service: ServiceJob, categoryName: string, subcategoryName: string) => void;
  onClose: () => void;
  onClearSearch: () => void;
}

export const SearchResultsPopup: React.FC<SearchResultsPopupProps> = ({
  searchTerm,
  results,
  isVisible,
  onSelectService,
  onClose,
  onClearSearch
}) => {
  if (!isVisible || !searchTerm.trim()) return null;

  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-1">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="absolute top-12 left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">
            Search Results for "{searchTerm}" ({results.length} found)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClearSearch}
            className="p-1 hover:bg-gray-200 rounded text-gray-500"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded text-gray-500"
            title="Close popup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="max-h-80 overflow-y-auto">
        {results.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No services found matching "{searchTerm}"</p>
            <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {results.map((result, index) => (
              <Card
                key={`${result.service.id}-${index}`}
                className="cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors"
                onClick={() => onSelectService(result.service, result.categoryName, result.subcategoryName)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">
                        {highlightMatch(result.service.name, searchTerm)}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">
                        {highlightMatch(result.fullPath, searchTerm)}
                      </p>
                      {result.service.description && (
                        <p className="text-xs text-gray-500">
                          {highlightMatch(result.service.description, searchTerm)}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-3">
                      {result.service.price && (
                        <span className="text-sm font-medium text-green-600">
                          ${result.service.price}
                        </span>
                      )}
                      {result.service.estimatedTime && (
                        <div className="text-xs text-gray-500">
                          {result.service.estimatedTime} min
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t bg-gray-50 text-xs text-gray-500">
        <span>Press ESC to close • Click outside to dismiss</span>
      </div>
    </div>
  );
};
