
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TeamSearchProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function TeamSearch({ searchQuery, onSearchChange }: TeamSearchProps) {
  return (
    <div className="relative w-full md:max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <Input
        type="search"
        placeholder="Search team members..."
        className="pl-10"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}
