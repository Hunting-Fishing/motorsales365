
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Star, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SavedSearch } from "@/types/document";
import { deleteSavedSearch, getSavedSearches, saveSavedSearch } from "@/services/searchService";

interface SavedSearchesProps {
  currentFilters: Record<string, any>;
  onApplySearch: (filters: Record<string, any>) => void;
}

export const SavedSearches: React.FC<SavedSearchesProps> = ({
  currentFilters,
  onApplySearch,
}) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const { toast } = useToast();

  // Load saved searches
  useEffect(() => {
    const loadSavedSearches = async () => {
      const searches = await getSavedSearches();
      setSavedSearches(searches);
    };
    
    loadSavedSearches();
  }, []);

  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      toast({
        title: "Error",
        description: "Please provide a name for your search",
        variant: "destructive",
      });
      return;
    }

    const result = await saveSavedSearch(searchName, currentFilters);
    
    if (result) {
      setSavedSearches(prev => [result, ...prev]);
      setIsDialogOpen(false);
      setSearchName("");

      toast({
        title: "Search saved",
        description: "Your search filters have been saved",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to save search",
        variant: "destructive",
      });
    }
  };

  const handleApplySearch = (search: SavedSearch) => {
    onApplySearch(search.search_query);
    
    toast({
      title: "Search applied",
      description: `Applied saved search: ${search.name}`,
    });
  };

  const handleDeleteSearch = async (id: string) => {
    const success = await deleteSavedSearch(id);
    
    if (success) {
      setSavedSearches(prev => prev.filter(search => search.id !== id));
      
      toast({
        title: "Search deleted",
        description: "The saved search has been removed",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete saved search",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Saved Searches</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsDialogOpen(true)}
          disabled={!Object.keys(currentFilters).some(key => 
            currentFilters[key] !== undefined && 
            currentFilters[key] !== "" && 
            (!Array.isArray(currentFilters[key]) || currentFilters[key].length > 0)
          )}
        >
          <Plus className="h-4 w-4 mr-1" /> Save Current
        </Button>
      </div>

      {savedSearches.length === 0 ? (
        <div className="text-sm text-gray-500 italic py-2">
          No saved searches yet. Apply filters and save them for quick access.
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {savedSearches.map((search) => (
            <div 
              key={search.id} 
              className="flex justify-between items-center p-2 bg-gray-50 rounded-md hover:bg-gray-100 border"
            >
              <button 
                className="text-sm font-medium text-blue-600 hover:underline text-left flex-1"
                onClick={() => handleApplySearch(search)}
              >
                {search.name}
              </button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleDeleteSearch(search.id)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Current Search</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter a name for this search"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch}>
              <Star className="mr-2 h-4 w-4" /> Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
