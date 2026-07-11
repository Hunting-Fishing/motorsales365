
import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface InventorySearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function InventorySearch({ searchQuery, setSearchQuery }: InventorySearchProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search inventory by name, SKU, or category..."
        className="w-full pl-8"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}
