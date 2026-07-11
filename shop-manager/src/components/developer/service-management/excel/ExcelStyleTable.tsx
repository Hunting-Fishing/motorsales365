
import React, { useState, useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

interface ExcelStyleTableProps {
  data: any[];
  onCellEdit: (rowIndex: number, field: string, value: any) => void;
}

export function ExcelStyleTable({ data, onCellEdit }: ExcelStyleTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const columns = [
    { key: 'category', label: 'Category', width: '200px' },
    { key: 'subcategory', label: 'Subcategory', width: '200px' },
    { key: 'serviceName', label: 'Service Name', width: '300px' },
    { key: 'description', label: 'Description', width: '400px' },
    { key: 'estimatedTime', label: 'Est. Time (min)', width: '120px' },
    { key: 'price', label: 'Price ($)', width: '100px' }
  ];

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleCellClick = (rowIndex: number, columnKey: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, col: columnKey });
    setEditValue(String(currentValue || ''));
  };

  const handleCellSave = () => {
    if (editingCell) {
      const { row, col } = editingCell;
      let processedValue: any = editValue;
      
      // Process value based on column type
      if (col === 'estimatedTime' || col === 'price') {
        processedValue = parseFloat(editValue) || 0;
      }
      
      onCellEdit(row, col, processedValue);
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

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50">
        <p className="text-gray-500">No data available for this section</p>
      </div>
    );
  }

  return (
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
          {data.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
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
                  onClick={() => handleCellClick(rowIndex, column.key, row[column.key])}
                >
                  {editingCell?.row === rowIndex && editingCell?.col === column.key ? (
                    <Input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleCellSave}
                      onKeyDown={handleKeyDown}
                      className="border-2 border-blue-500 rounded-none shadow-none h-auto py-2 px-3 text-sm"
                    />
                  ) : (
                    <div className="py-2 px-3 text-sm min-h-[36px] flex items-center">
                      {formatCellValue(row[column.key], column.key)}
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
  );
}
