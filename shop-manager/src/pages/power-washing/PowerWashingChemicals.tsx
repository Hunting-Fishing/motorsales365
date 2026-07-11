import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Search, 
  ArrowLeft,
  FlaskConical,
  AlertTriangle
} from 'lucide-react';
import { usePowerWashingChemicals } from '@/hooks/usePowerWashing';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const typeColors: Record<string, string> = {
  detergent: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  degreaser: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  sanitizer: 'bg-green-500/10 text-green-500 border-green-500/20',
  surfactant: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  specialty: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
};

export default function PowerWashingChemicals() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: chemicals, isLoading } = usePowerWashingChemicals();

  const filteredChemicals = chemicals?.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.chemical_type.toLowerCase().includes(query) ||
      item.brand?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Chemicals & Supplies</h1>
            <p className="text-muted-foreground">Track your cleaning chemicals and supplies inventory</p>
          </div>
          <Button onClick={() => navigate('/power-washing/chemicals/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Chemical
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search chemicals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Chemicals Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : filteredChemicals && filteredChemicals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChemicals.map((item) => {
            const isLow = item.reorder_level && item.current_quantity <= item.reorder_level;
            const stockPercentage = item.reorder_level 
              ? Math.min((item.current_quantity / (item.reorder_level * 2)) * 100, 100)
              : 50;
            
            return (
              <Card 
                key={item.id} 
                className={`cursor-pointer hover:border-primary/50 transition-colors ${
                  isLow ? 'border-amber-500/50' : ''
                }`}
                onClick={() => navigate(`/power-washing/chemicals/${item.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FlaskConical className="h-6 w-6 text-primary" />
                    </div>
                    <Badge className={typeColors[item.chemical_type] || 'bg-gray-500/10 text-gray-500'}>
                      {item.chemical_type}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-lg text-foreground mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {item.brand && `${item.brand} • `}
                    {item.dilution_ratio && `Dilution: ${item.dilution_ratio}`}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Stock Level</span>
                        <span className={`font-medium ${isLow ? 'text-amber-500' : ''}`}>
                          {item.current_quantity} {item.unit_of_measure}
                        </span>
                      </div>
                      <Progress 
                        value={stockPercentage} 
                        className={`h-2 ${isLow ? '[&>div]:bg-amber-500' : ''}`}
                      />
                    </div>

                    {item.cost_per_unit && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cost per {item.unit_of_measure}</span>
                        <span className="font-medium">${item.cost_per_unit}</span>
                      </div>
                    )}
                  </div>

                  {isLow && (
                    <div className="mt-4 flex items-center gap-2 text-amber-500 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Low stock - reorder needed</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No chemicals found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Add your cleaning chemicals to track inventory'}
            </p>
            <Button onClick={() => navigate('/power-washing/chemicals/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Chemical
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
