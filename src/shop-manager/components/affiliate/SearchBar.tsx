
import React from 'react';
import { Segment } from 'semantic-ui-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SearchBar = ({ searchQuery, setSearchQuery }: SearchBarProps) => {
  return (
    <Segment className="mb-6 shadow-sm border border-gray-200">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <Input 
            placeholder="Search for tools by name, category, or part number..." 
            className="pl-10 pr-4 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          Search
        </Button>
      </div>
    </Segment>
  );
};

export default SearchBar;
