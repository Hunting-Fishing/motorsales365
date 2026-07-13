
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Upload, Plus, Save } from 'lucide-react';

interface ExcelViewHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  totalSectors: number;
}

export function ExcelViewHeader({ searchTerm, onSearchChange, totalSectors }: ExcelViewHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-800">Service Hierarchy - Excel View</h2>
          <span className="text-sm text-gray-500">
            {totalSectors} sectors available
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search services, categories..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-80 h-9 text-sm border-gray-300 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2 border-l border-gray-200 pl-3">
            <Button variant="outline" size="sm" className="h-9 px-3">
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3">
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button size="sm" className="h-9 px-3 bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-1" />
              Save All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
