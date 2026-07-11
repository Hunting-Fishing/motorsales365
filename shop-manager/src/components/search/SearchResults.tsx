
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Package, 
  Wrench, 
  User, 
  ClipboardList,
  ChevronRight 
} from "lucide-react";
import { SearchResult, SearchResultType } from "@/utils/search"; // Updated import
import { useState, useEffect, useRef } from "react";

interface SearchResultsProps {
  results: SearchResult[];
  onItemClick: (url: string) => void;
}

export function SearchResults({ results, onItemClick }: SearchResultsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultRefs = useRef<(HTMLLIElement | null)[]>([]);
  
  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
    resultRefs.current = resultRefs.current.slice(0, results.length);
  }, [results]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (results.length === 0) return;
      
      // Arrow down: select next result
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      }
      
      // Arrow up: select previous result
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      }
      
      // Enter: navigate to selected result
      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        onItemClick(results[selectedIndex].url);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [results, selectedIndex, onItemClick]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (resultRefs.current[selectedIndex]) {
      resultRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Get icon based on result type
  const getIcon = (type: SearchResultType) => {
    switch (type) {
      case 'work-order':
        return <ClipboardList className="h-4 w-4 text-blue-500" />;
      case 'invoice':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'customer':
        return <User className="h-4 w-4 text-purple-500" />;
      case 'equipment':
        return <Wrench className="h-4 w-4 text-orange-500" />;
      case 'inventory':
        return <Package className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-md shadow-lg border border-gray-200 w-full max-w-md max-h-[70vh] overflow-y-auto">
      {results.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No results found
        </div>
      ) : (
        <ul className="py-2">
          {results.map((result, index) => (
            <li 
              key={`${result.type}-${result.id}`}
              ref={el => resultRefs.current[index] = el}
              className={`px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors ${
                selectedIndex === index ? 'bg-gray-100' : ''
              }`}
              onClick={() => onItemClick(result.url)}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {getIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {result.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {result.subtitle}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
