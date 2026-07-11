
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, MousePointer, Heart, Share2 } from 'lucide-react';
import { TopProductAnalytics } from '@/types/analytics';

interface TopProductsTableProps {
  title: string;
  products: TopProductAnalytics[];
  metric: 'views' | 'clicks' | 'saves' | 'shares';
}

export function TopProductsTable({ title, products, metric }: TopProductsTableProps) {
  const renderIcon = () => {
    switch (metric) {
      case 'views':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'clicks':
        return <MousePointer className="h-4 w-4 text-green-500" />;
      case 'saves':
        return <Heart className="h-4 w-4 text-purple-500" />;
      case 'shares':
        return <Share2 className="h-4 w-4 text-amber-500" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <Card className="shadow-md bg-white rounded-xl border border-gray-100">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        {renderIcon()}
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-4 text-slate-500">No data available</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="text-right">{product.count.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{product.percentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
