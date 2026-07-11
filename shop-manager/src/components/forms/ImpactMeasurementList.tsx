import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, Search, Filter, TrendingUp, Target, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImpactMeasurementData {
  id: string;
  measurement_name: string;
  category: string;
  measurement_type: string;
  current_value: number;
  target_value?: number;
  unit_of_measure: string;
  measurement_period: string;
  data_source: string;
  verification_method: string;
  last_measured_date?: string;
  next_measurement_date?: string;
  baseline_value?: number;
  baseline_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ImpactMeasurementListProps {
  measurements: ImpactMeasurementData[];
  onEdit?: (measurement: ImpactMeasurementData) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export const ImpactMeasurementList: React.FC<ImpactMeasurementListProps> = ({
  measurements,
  onEdit,
  onDelete,
  loading = false
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredMeasurements = measurements.filter(measurement => {
    const matchesSearch = measurement.measurement_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         measurement.unit_of_measure.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || measurement.category === filterCategory;
    const matchesType = filterType === 'all' || measurement.measurement_type === filterType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const calculateProgress = (current: number, target?: number, baseline?: number): number => {
    if (!target) return 0;
    if (baseline !== undefined && baseline !== null) {
      const range = target - baseline;
      const progress = current - baseline;
      return range > 0 ? Math.min((progress / range) * 100, 100) : 0;
    }
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 60) return 'text-blue-600';
    if (progress >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCategoryBadgeColor = (category: string): string => {
    const colors = {
      'general': 'bg-gray-100 text-gray-800',
      'environment': 'bg-green-100 text-green-800',
      'community': 'bg-blue-100 text-blue-800',
      'health': 'bg-red-100 text-red-800',
      'education': 'bg-purple-100 text-purple-800'
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      onDelete?.(id);
      toast({
        title: "Measurement Deleted",
        description: `"${name}" has been removed from your impact measurements.`,
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Impact Measurements</CardTitle>
          <CardDescription>Loading measurements...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Impact Measurements ({measurements.length})
        </CardTitle>
        <CardDescription>
          Manage and track your organization's impact measurements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search measurements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="environment">Environment</SelectItem>
              <SelectItem value="community">Community</SelectItem>
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="education">Education</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="quantitative">Quantitative</SelectItem>
              <SelectItem value="qualitative">Qualitative</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Measurements List */}
        {filteredMeasurements.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {measurements.length === 0 ? 'No Impact Measurements' : 'No Matching Measurements'}
            </h3>
            <p className="text-muted-foreground">
              {measurements.length === 0 
                ? 'Create your first impact measurement to start tracking your organization\'s outcomes.'
                : 'Try adjusting your search terms or filters to find what you\'re looking for.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Measurement</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Target Progress</TableHead>
                  <TableHead>Last Measured</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeasurements.map((measurement) => {
                  const progress = calculateProgress(
                    measurement.current_value,
                    measurement.target_value,
                    measurement.baseline_value
                  );
                  
                  return (
                    <TableRow key={measurement.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">
                            {measurement.measurement_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {measurement.measurement_type} • {measurement.measurement_period}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryBadgeColor(measurement.category)}>
                          {measurement.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {measurement.current_value.toLocaleString()} {measurement.unit_of_measure}
                        </div>
                        {measurement.baseline_value !== undefined && (
                          <div className="text-sm text-muted-foreground">
                            Baseline: {measurement.baseline_value.toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {measurement.target_value ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className={getProgressColor(progress)}>
                                {progress.toFixed(1)}%
                              </span>
                              <span className="text-muted-foreground">
                                Target: {measurement.target_value.toLocaleString()}
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No target set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {measurement.last_measured_date 
                            ? new Date(measurement.last_measured_date).toLocaleDateString()
                            : 'No date'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit?.(measurement)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(measurement.id, measurement.measurement_name)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};