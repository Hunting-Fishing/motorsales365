
import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Save } from 'lucide-react';

interface ExcelServiceData {
  id: string;
  sector: string;
  category: string;
  subcategory: string;
  serviceName: string;
  description: string;
  estimatedTime: number;
  price: number;
}

interface RealDataExcelTableProps {
  data: ExcelServiceData[];
  sectorName: string;
  onServiceUpdate: (serviceId: string, updates: Partial<ExcelServiceData>) => void;
}

export function RealDataExcelTable({ data, sectorName, onServiceUpdate }: RealDataExcelTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const columns = [
    { key: 'category', label: 'Category', width: '200px', editable: true },
    { key: 'subcategory', label: 'Subcategory', width: '200px', editable: true },
    { key: 'serviceName', label: 'Service Name', width: '300px', editable: true },
    { key: 'description', label: 'Description', width: '400px', editable: true },
    { key: 'estimatedTime', label: 'Est. Time (min)', width: '120px', editable: true },
    { key: 'price', label: 'Price ($)', width: '100px', editable: true }
  ];

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    
    return data.filter(item =>
      item.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subcategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const handleCellClick = (rowIndex: number, columnKey: string, currentValue: any) => {
    const column = columns.find(c => c.key === columnKey);
    if (!column?.editable) return;
    
    setEditingCell({ row: rowIndex, col: columnKey });
    setEditValue(String(currentValue || ''));
  };

  const handleCellSave = () => {
    if (editingCell) {
      const { row, col } = editingCell;
      const service = filteredData[row];
      let processedValue: any = editValue;
      
      if (col === 'estimatedTime' || col === 'price') {
        processedValue = parseFloat(editValue) || 0;
      }
      
      onServiceUpdate(service.id, { [col]: processedValue });
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const formatCellValue = (value: any, columnKey: string) => {
    if (columnKey === 'price' && typeof value === 'number') {
      return `$${value.toFixed(2)}`;
    }
    if (columnKey === 'estimatedTime' && typeof value === 'number') {
      return `${value} min`;
    }
    return String(value || '');
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-800">{sectorName}</h2>
            <span className="text-sm text-gray-500">
              {filteredData.length} services
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80 h-9 text-sm border-gray-300 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center space-x-2 border-l border-gray-200 pl-3">
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

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-gray-50">
            <p className="text-gray-500">No services found for "{searchTerm}"</p>
          </div>
        ) : (
          <div className="excel-table-container bg-white border border-gray-200">
            <Table className="excel-table">
              <TableHeader className="bg-gray-50 sticky top-0 z-10">
                <TableRow className="border-b border-gray-200">
                  <TableHead className="w-12 text-center bg-gray-100 border-r border-gray-200 font-semibold">
                    #
                  </TableHead>
                  {columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className="border-r border-gray-200 font-semibold text-gray-700 bg-gray-50 px-2 py-3"
                      style={{ width: column.width, minWidth: column.width }}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, rowIndex) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors"
                  >
                    <TableCell className="w-12 text-center bg-gray-50 border-r border-gray-200 font-medium text-gray-600">
                      {rowIndex + 1}
                    </TableCell>
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className="border-r border-gray-100 p-0 cursor-pointer hover:bg-blue-50 transition-colors"
                        style={{ width: column.width, minWidth: column.width }}
                        onClick={() => handleCellClick(rowIndex, column.key, (row as any)[column.key])}
                      >
                        {editingCell?.row === rowIndex && editingCell?.col === column.key ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={handleKeyDown}
                            className="border-2 border-blue-500 rounded-none shadow-none h-auto py-2 px-3 text-sm"
                            autoFocus
                          />
                        ) : (
                          <div className="py-2 px-3 text-sm min-h-[36px] flex items-center">
                            {formatCellValue((row as any)[column.key], column.key)}
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <style dangerouslySetInnerHTML={{
              __html: `
                .excel-table-container {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                .excel-table th,
                .excel-table td {
                  font-size: 12px;
                }
                .excel-table th {
                  background-color: #f8f9fa;
                  font-weight: 600;
                }
              `
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
