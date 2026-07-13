import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Video, Calculator, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HelpResource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  file_url: string;
  download_count: number;
  tags: string[];
  is_active: boolean;
}

export const ResourceLibrary: React.FC = () => {
  const [resources, setResources] = useState<HelpResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<HelpResource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [resources, searchTerm, typeFilter]);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('help_resources' as any)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Transform the tags from Json to string[]
      const transformedData = (data as any)?.map((resource: any) => ({
        ...resource,
        tags: Array.isArray(resource.tags) ? resource.tags : []
      })) || [];
      setResources(transformedData);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast({
        title: "Error",
        description: "Failed to load resources",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = resources;

    if (searchTerm) {
      filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(resource => resource.resource_type === typeFilter);
    }

    setFilteredResources(filtered);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'template':
        return <FileText className="h-5 w-5" />;
      case 'calculator':
        return <Calculator className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const handleDownload = async (resource: HelpResource) => {
    try {
      // Increment download count
      await supabase
        .from('help_resources' as any)
        .update({ download_count: resource.download_count + 1 })
        .eq('id', resource.id);

      // Handle file download logic here
      toast({
        title: "Download Started",
        description: `Downloading ${resource.title}`,
      });
    } catch (error) {
      console.error('Error downloading resource:', error);
      toast({
        title: "Error",
        description: "Failed to download resource",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Resource Library</h2>
          <p className="text-muted-foreground">Download templates and tools</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-muted rounded w-20"></div>
                  <div className="h-8 bg-muted rounded w-24"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Resource Library</h2>
        <p className="text-muted-foreground">Download templates and tools</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="template">Templates</SelectItem>
            <SelectItem value="calculator">Calculators</SelectItem>
            <SelectItem value="guide">Guides</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((resource) => (
          <Card key={resource.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {getResourceIcon(resource.resource_type)}
                <CardTitle className="text-lg">{resource.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{resource.description}</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {resource.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {resource.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{resource.tags.length - 3} more
                  </Badge>
                )}
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  {resource.download_count} downloads
                </div>
                <Button size="sm" onClick={() => handleDownload(resource)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredResources.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Resources Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || typeFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Resources will appear here when available.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};