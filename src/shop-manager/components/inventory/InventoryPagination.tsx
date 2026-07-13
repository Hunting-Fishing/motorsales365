
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InventoryPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const InventoryPagination: React.FC<InventoryPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const showEllipsis = totalPages > 7;
  
  const renderPageButtons = () => {
    const buttons = [];
    
    // Always show first page
    buttons.push(
      <Button
        key={1}
        variant={currentPage === 1 ? "default" : "outline"}
        size="sm"
        onClick={() => onPageChange(1)}
        className="w-10 h-10"
      >
        1
      </Button>
    );
    
    if (showEllipsis) {
      // Show ellipsis if not in first few pages
      if (currentPage > 4) {
        buttons.push(
          <Button key="ellipsis1" variant="ghost" size="sm" className="w-10 h-10 cursor-default">
            ...
          </Button>
        );
      }
      
      // Show pages around current page
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        buttons.push(
          <Button
            key={i}
            variant={currentPage === i ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(i)}
            className="w-10 h-10"
          >
            {i}
          </Button>
        );
      }
      
      // Show ellipsis if not in last few pages
      if (currentPage < totalPages - 3) {
        buttons.push(
          <Button key="ellipsis2" variant="ghost" size="sm" className="w-10 h-10 cursor-default">
            ...
          </Button>
        );
      }
    } else {
      // If not many pages, show all
      for (let i = 2; i < totalPages; i++) {
        buttons.push(
          <Button
            key={i}
            variant={currentPage === i ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(i)}
            className="w-10 h-10"
          >
            {i}
          </Button>
        );
      }
    }
    
    // Always show last page if more than 1 page
    if (totalPages > 1) {
      buttons.push(
        <Button
          key={totalPages}
          variant={currentPage === totalPages ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(totalPages)}
          className="w-10 h-10"
        >
          {totalPages}
        </Button>
      );
    }
    
    return buttons;
  };

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        
        <div className="hidden md:flex space-x-2">
          {renderPageButtons()}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
