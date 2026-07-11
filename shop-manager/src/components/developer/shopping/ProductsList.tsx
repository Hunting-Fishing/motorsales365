import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PenLine, Trash2, Eye, ExternalLink, Star, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AffiliateTool } from "@/types/affiliate";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface ProductsListProps {
  products: AffiliateTool[];
  loading?: boolean;
  categoryName?: string;
  onEdit?: (product: AffiliateTool) => void;
  onDelete?: (product: AffiliateTool) => void;
}

const ProductsList: React.FC<ProductsListProps> = ({ 
  products, 
  loading = false,
  categoryName,
  onEdit,
  onDelete
}) => {
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ key, direction });
  };

  const sortedProducts = React.useMemo(() => {
    if (!sortConfig) return [...products];
    
    return [...products].sort((a, b) => {
      if (!a[sortConfig.key] && !b[sortConfig.key]) return 0;
      if (!a[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (!b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    });
  }, [products, sortConfig]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products?.length) {
    return (
      <div className="text-center py-8 border rounded-md bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400">No products found {categoryName ? `in ${categoryName}` : ''}</p>
      </div>
    );
  }

  const SortableHeader = ({ column, label }) => (
    <div 
      className="flex items-center cursor-pointer hover:text-blue-600"
      onClick={() => handleSort(column)}
    >
      {label}
      <ArrowUpDown className="ml-1 h-4 w-4" />
      {sortConfig?.key === column && (
        <span className="ml-1 text-xs">
          {sortConfig.direction === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Image</TableHead>
            <TableHead><SortableHeader column="name" label="Product" /></TableHead>
            <TableHead><SortableHeader column="price" label="Price" /></TableHead>
            <TableHead><SortableHeader column="category" label="Category" /></TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProducts.map((product) => (
            <TableRow key={product.id} className="group hover:bg-slate-50">
              <TableCell>
                {product.imageUrl ? (
                  <div className="relative h-12 w-12 rounded-md overflow-hidden border group-hover:ring-2 group-hover:ring-blue-200 transition-all">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center">
                    <Eye className="h-6 w-6 text-slate-400" />
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium group-hover:text-blue-600 transition-colors">
                    {product.name}
                    {product.bestSeller && (
                      <Star className="h-3 w-3 text-amber-500 inline ml-1" />
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{product.manufacturer}</p>
                </div>
              </TableCell>
              <TableCell>
                {product.salePrice ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <span className="font-medium text-green-600">${product.salePrice}</span>
                          <span className="ml-1 text-sm text-slate-500 line-through">${product.price}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Save ${(product.price - product.salePrice).toFixed(2)} 
                          ({Math.round((1 - product.salePrice / product.price) * 100)}%)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span>${product.price}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-slate-100">
                  {product.category}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {product.featured && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                      Featured
                    </Badge>
                  )}
                  {product.bestSeller && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                      Best Seller
                    </Badge>
                  )}
                  {product.seller && (
                    <Badge variant="outline" className="text-slate-600">
                      {product.seller}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => window.open(product.affiliateLink, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open product link</p>
                      </TooltipContent>
                    </Tooltip>

                    {onEdit && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => onEdit(product)}
                          >
                            <PenLine className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit product</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {onDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onDelete(product)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete product</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProductsList;
