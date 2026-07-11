import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KanbanFiltersProps {
  filters: {
    priority: string;
    status: string;
    search: string;
  };
  onFiltersChange: (filters: { priority: string; status: string; search: string }) => void;
}

export function KanbanFilters({ filters, onFiltersChange }: KanbanFiltersProps) {
  const hasFilters = filters.priority || filters.status || filters.search;

  const clearFilters = () => {
    onFiltersChange({ priority: '', status: '', search: '' });
  };

  return (
    <div className="flex items-center gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-8 w-[200px] h-8"
        />
      </div>

      {/* Priority Filter */}
      <Select
        value={filters.priority}
        onValueChange={(value) => onFiltersChange({ ...filters, priority: value })}
      >
        <SelectTrigger className="w-[120px] h-8">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
