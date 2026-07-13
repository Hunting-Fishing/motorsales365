
import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Hammer, Plus, Search, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toolsService, Tool, ToolCategory } from '@/services/developer/toolsService';
import { toast } from 'sonner';

export default function ToolsManagement() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [toolsData, categoriesData] = await Promise.all([
        toolsService.getTools(),
        toolsService.getToolCategories(),
      ]);
      setTools(toolsData);
      setCategories(categoriesData);
    } catch (error) {
      toast.error('Failed to load tools data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'in_use': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'retired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="outline" size="sm" className="mb-4" asChild>
          <Link to="/system-admin">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Developer Portal
          </Link>
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Hammer className="h-8 w-8 text-amber-600" />
          <h1 className="text-3xl font-bold">Tool Management</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          Manage tools, equipment, and their categories
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{tools.length}</p>
              <p className="text-sm text-muted-foreground">Total Tools</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {tools.filter(t => t.status === 'available').length}
              </p>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {tools.filter(t => t.status === 'in_use').length}
              </p>
              <p className="text-sm text-muted-foreground">In Use</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {tools.filter(t => t.status === 'maintenance').length}
              </p>
              <p className="text-sm text-muted-foreground">Maintenance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Add Tool */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search tools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Tool
        </Button>
      </div>

      {/* Tools List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <Card key={tool.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  {tool.name}
                </span>
                <Badge className={getStatusColor(tool.status)}>
                  {tool.status}
                </Badge>
              </CardTitle>
              <CardDescription>{tool.category}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Location:</span>
                  <span className="text-sm">{tool.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cost:</span>
                  <span className="text-sm">${tool.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Purchase Date:</span>
                  <span className="text-sm">{tool.purchase_date}</span>
                </div>
                {tool.serial_number && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Serial:</span>
                    <span className="text-sm font-mono">{tool.serial_number}</span>
                  </div>
                )}
                {tool.notes && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">Notes:</p>
                    <p className="text-sm">{tool.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Hammer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tools found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first tool'}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Tool
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
