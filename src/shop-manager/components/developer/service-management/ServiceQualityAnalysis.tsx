import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceMainCategory, ServiceSubcategory, ServiceJob } from '@/types/service';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { FileText, DollarSign, Clock, AlertCircle, TrendingUp, Target } from 'lucide-react';

interface ServiceQualityAnalysisProps {
  categories: ServiceMainCategory[];
}

interface QualityMetrics {
  totalServices: number;
  servicesWithPricing: number;
  servicesWithDescription: number;
  servicesWithEstimatedTime: number;
  averagePrice: number;
  averageEstimatedTime: number;
  completenessScore: number;
  priceRangeDistribution: { range: string; count: number }[];
  categoryCompleteness: { name: string; completeness: number; services: number }[];
  duplicates: { name: string; count: number; category: string }[];
  inconsistencies: { type: string; description: string; count: number }[];
}

const ServiceQualityAnalysis: React.FC<ServiceQualityAnalysisProps> = ({ categories }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const qualityMetrics = useMemo((): QualityMetrics => {
    let totalServices = 0;
    let servicesWithPricing = 0;
    let servicesWithDescription = 0;
    let servicesWithEstimatedTime = 0;
    let totalPrice = 0;
    let totalTime = 0;
    const priceRanges = { '0-50': 0, '51-100': 0, '101-200': 0, '201+': 0 };
    const categoryCompleteness: { name: string; completeness: number; services: number }[] = [];
    const duplicates: { name: string; count: number; category: string }[] = [];
    const inconsistencies: { type: string; description: string; count: number }[] = [];

    // Service name tracking for duplicates
    const serviceNames = new Map<string, { count: number; categories: string[] }>();

    categories.forEach(category => {
      let categoryServices = 0;
      let categoryComplete = 0;

      category.subcategories.forEach(subcategory => {
        subcategory.jobs.forEach(job => {
          totalServices++;
          categoryServices++;

          // Track service names for duplicate detection
          const normalizedName = job.name.toLowerCase().trim();
          if (serviceNames.has(normalizedName)) {
            const existing = serviceNames.get(normalizedName)!;
            existing.count++;
            if (!existing.categories.includes(category.name)) {
              existing.categories.push(category.name);
            }
          } else {
            serviceNames.set(normalizedName, { count: 1, categories: [category.name] });
          }

          let jobCompleteFields = 0;
          const totalFields = 3; // name, price, description

          // Always count name as complete
          jobCompleteFields++;

          if (job.price && job.price > 0) {
            servicesWithPricing++;
            totalPrice += job.price;
            jobCompleteFields++;

            // Price range distribution
            if (job.price <= 50) priceRanges['0-50']++;
            else if (job.price <= 100) priceRanges['51-100']++;
            else if (job.price <= 200) priceRanges['101-200']++;
            else priceRanges['201+']++;
          }

          if (job.description && job.description.trim().length > 0) {
            servicesWithDescription++;
            jobCompleteFields++;
          }

          if (job.estimatedTime && job.estimatedTime > 0) {
            servicesWithEstimatedTime++;
            totalTime += job.estimatedTime;
          }

          categoryComplete += (jobCompleteFields / totalFields) * 100;
        });
      });

      if (categoryServices > 0) {
        categoryCompleteness.push({
          name: category.name,
          completeness: Math.round(categoryComplete / categoryServices),
          services: categoryServices
        });
      }
    });

    // Find duplicates
    serviceNames.forEach((data, name) => {
      if (data.count > 1) {
        duplicates.push({
          name: name,
          count: data.count,
          category: data.categories.join(', ')
        });
      }
    });

    // Detect inconsistencies
    if (servicesWithPricing > 0 && servicesWithPricing < totalServices * 0.5) {
      inconsistencies.push({
        type: 'Pricing',
        description: 'Less than 50% of services have pricing information',
        count: totalServices - servicesWithPricing
      });
    }

    if (servicesWithDescription > 0 && servicesWithDescription < totalServices * 0.3) {
      inconsistencies.push({
        type: 'Descriptions',
        description: 'Less than 30% of services have descriptions',
        count: totalServices - servicesWithDescription
      });
    }

    const priceRangeDistribution = Object.entries(priceRanges).map(([range, count]) => ({
      range,
      count
    }));

    const completenessScore = Math.round(
      ((servicesWithPricing + servicesWithDescription + servicesWithEstimatedTime) / (totalServices * 3)) * 100
    );

    return {
      totalServices,
      servicesWithPricing,
      servicesWithDescription,
      servicesWithEstimatedTime,
      averagePrice: servicesWithPricing > 0 ? Math.round(totalPrice / servicesWithPricing) : 0,
      averageEstimatedTime: servicesWithEstimatedTime > 0 ? Math.round(totalTime / servicesWithEstimatedTime) : 0,
      completenessScore,
      priceRangeDistribution,
      categoryCompleteness,
      duplicates,
      inconsistencies
    };
  }, [categories]);

  const getCompletenessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletenessVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Service Quality Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="completeness">Data Completeness</TabsTrigger>
              <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
              <TabsTrigger value="inconsistencies">Issues</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Total Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{qualityMetrics.totalServices}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Average Price
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${qualityMetrics.averagePrice}
                    </div>
                    <p className="text-sm text-gray-500">
                      {qualityMetrics.servicesWithPricing} services with pricing
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Avg. Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {qualityMetrics.averageEstimatedTime}m
                    </div>
                    <p className="text-sm text-gray-500">
                      {qualityMetrics.servicesWithEstimatedTime} services with time estimates
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Data Completeness</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <Progress value={qualityMetrics.completenessScore} className="h-2" />
                    <span className={`font-medium ${getCompletenessColor(qualityMetrics.completenessScore)}`}>
                      {qualityMetrics.completenessScore}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={getCompletenessVariant(Math.round((qualityMetrics.servicesWithPricing / qualityMetrics.totalServices) * 100))}>
                        {Math.round((qualityMetrics.servicesWithPricing / qualityMetrics.totalServices) * 100)}%
                      </Badge>
                      <span>With pricing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getCompletenessVariant(Math.round((qualityMetrics.servicesWithDescription / qualityMetrics.totalServices) * 100))}>
                        {Math.round((qualityMetrics.servicesWithDescription / qualityMetrics.totalServices) * 100)}%
                      </Badge>
                      <span>With descriptions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getCompletenessVariant(Math.round((qualityMetrics.servicesWithEstimatedTime / qualityMetrics.totalServices) * 100))}>
                        {Math.round((qualityMetrics.servicesWithEstimatedTime / qualityMetrics.totalServices) * 100)}%
                      </Badge>
                      <span>With time estimates</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Price Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={qualityMetrics.priceRangeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Issues Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {qualityMetrics.inconsistencies.length > 0 ? (
                      <div className="space-y-2">
                        {qualityMetrics.inconsistencies.map((issue, index) => (
                          <Alert key={index} variant="warning">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              {issue.description} ({issue.count} services affected)
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <p className="text-gray-500">No major issues detected</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="completeness">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Category Completeness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {qualityMetrics.categoryCompleteness
                        .sort((a, b) => b.completeness - a.completeness)
                        .map((category, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{category.name}</span>
                                <Badge variant="outline">{category.services} services</Badge>
                              </div>
                              <span className={getCompletenessColor(category.completeness)}>
                                {category.completeness}%
                              </span>
                            </div>
                            <Progress value={category.completeness} className="h-2" />
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Improvement Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {qualityMetrics.servicesWithPricing < qualityMetrics.totalServices && (
                        <div className="flex items-start gap-2">
                          <DollarSign className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div>
                            <h4 className="font-medium">Add pricing information</h4>
                            <p className="text-sm text-gray-600">
                              {qualityMetrics.totalServices - qualityMetrics.servicesWithPricing} services are missing pricing information.
                            </p>
                          </div>
                        </div>
                      )}

                      {qualityMetrics.servicesWithDescription < qualityMetrics.totalServices && (
                        <div className="flex items-start gap-2">
                          <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div>
                            <h4 className="font-medium">Add service descriptions</h4>
                            <p className="text-sm text-gray-600">
                              {qualityMetrics.totalServices - qualityMetrics.servicesWithDescription} services are missing descriptions.
                            </p>
                          </div>
                        </div>
                      )}

                      {qualityMetrics.servicesWithEstimatedTime < qualityMetrics.totalServices && (
                        <div className="flex items-start gap-2">
                          <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div>
                            <h4 className="font-medium">Add time estimates</h4>
                            <p className="text-sm text-gray-600">
                              {qualityMetrics.totalServices - qualityMetrics.servicesWithEstimatedTime} services are missing time estimates.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="duplicates">
              <Card>
                <CardHeader>
                  <CardTitle>Duplicate Services</CardTitle>
                </CardHeader>
                <CardContent>
                  {qualityMetrics.duplicates.length > 0 ? (
                    <div className="space-y-4">
                      {qualityMetrics.duplicates.map((duplicate, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{duplicate.name}</h4>
                              <p className="text-sm text-gray-600">
                                Found in: {duplicate.category}
                              </p>
                            </div>
                            <Badge variant="destructive">{duplicate.count} occurrences</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-gray-500">No duplicate services found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inconsistencies">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Data Inconsistencies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {qualityMetrics.inconsistencies.length > 0 ? (
                      <div className="space-y-4">
                        {qualityMetrics.inconsistencies.map((issue, index) => (
                          <Alert key={index} variant="warning" className="flex items-start">
                            <AlertCircle className="h-5 w-5 mt-0.5" />
                            <div className="ml-2">
                              <h4 className="font-medium">{issue.type} Issue</h4>
                              <AlertDescription>
                                {issue.description}
                              </AlertDescription>
                              <p className="text-sm text-gray-600 mt-1">
                                {issue.count} services affected
                              </p>
                            </div>
                          </Alert>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <p className="text-gray-500">No inconsistencies detected</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pricing Consistency</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'With Pricing', value: qualityMetrics.servicesWithPricing },
                            { name: 'Without Pricing', value: qualityMetrics.totalServices - qualityMetrics.servicesWithPricing }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#4f46e5" />
                          <Cell fill="#e5e7eb" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceQualityAnalysis;
