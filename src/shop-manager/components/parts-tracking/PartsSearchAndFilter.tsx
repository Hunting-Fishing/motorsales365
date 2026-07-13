
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { usePartsSearch } from '@/hooks/parts/usePartsSearch';

export function PartsSearchAndFilter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const [parts, setParts] = useState<WorkOrderPart[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // Use the real parts service
  const { searchParts, getPartCategories } = usePartsSearch();

  useEffect(() => {
    loadCategories();
    handleSearch();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchTerm, category, status]);

  const loadCategories = async () => {
    const categoryList = await getPartCategories();
    setCategories(categoryList);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const filters = {
        searchTerm: searchTerm || undefined,
        category: category && category !== 'all' ? category : undefined,
        status: status && status !== 'all' ? status : undefined
      };
      
      const { parts: searchResults } = await searchParts(filters);
      setParts(searchResults);
    } catch (error) {
      console.error('Error searching parts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Parts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="installed">Installed</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={() => {
                setSearchTerm('');
                setCategory('');
                setStatus('');
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search Results ({parts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse p-3 border rounded">
                  <div className="space-y-2">
                    <div className="bg-gray-200 h-4 w-full rounded"></div>
                    <div className="bg-gray-200 h-4 w-3/4 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {parts.map((part) => (
              <div key={part.id} className="p-3 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{part.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {part.part_number} | {part.category} | Qty: {part.quantity}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${part.total_price.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground capitalize">{part.status}</div>
                </div>
              </div>
            ))}
            {parts.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No parts found matching your search criteria
              </div>
            )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
