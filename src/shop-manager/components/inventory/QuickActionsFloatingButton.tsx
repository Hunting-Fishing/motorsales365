import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Download, 
  Upload, 
  Search, 
  Zap,
  ShoppingCart,
  BarChart3,
  Settings,
  Filter,
  ScanLine,
  Package,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

interface QuickActionsFloatingButtonProps {
  stats: {
    lowStockCount: number;
    outOfStockCount: number;
  };
  onQuickReorder?: () => void;
  onBulkImport?: () => void;
  onGenerateReport?: () => void;
  onScanBarcode?: () => void;
}

export function QuickActionsFloatingButton({ 
  stats, 
  onQuickReorder, 
  onBulkImport, 
  onGenerateReport,
  onScanBarcode 
}: QuickActionsFloatingButtonProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  const urgentItemsCount = stats.lowStockCount + stats.outOfStockCount;
  const hasUrgentItems = urgentItemsCount > 0;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Alert Badge for urgent items */}
      {hasUrgentItems && (
        <div className="absolute -top-2 -left-2 animate-pulse">
          <Badge variant="destructive" className="shadow-lg">
            {urgentItemsCount}
          </Badge>
        </div>
      )}

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            size="lg" 
            className={`
              h-14 w-14 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300
              ${hasUrgentItems ? 'bg-red-600 hover:bg-red-700 animate-pulse' : ''}
              hover:scale-110 group
            `}
          >
            {hasUrgentItems ? (
              <AlertTriangle className="h-6 w-6" />
            ) : (
              <Zap className="h-6 w-6 group-hover:rotate-12 transition-transform" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          sideOffset={8}
          className="w-64 p-2"
        >
          {/* Quick Add */}
          <DropdownMenuItem 
            onClick={() => navigate('/inventory/add')}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-primary/10"
          >
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Plus className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Add New Item</p>
              <p className="text-xs text-muted-foreground">Create inventory item</p>
            </div>
          </DropdownMenuItem>

          {/* Quick Reorder (if urgent items) */}
          {hasUrgentItems && (
            <DropdownMenuItem 
              onClick={onQuickReorder}
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-amber-50"
            >
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Quick Reorder</p>
                <p className="text-xs text-muted-foreground">{urgentItemsCount} items need attention</p>
              </div>
              <Badge variant="destructive" className="text-xs">
                {urgentItemsCount}
              </Badge>
            </DropdownMenuItem>
          )}

          {/* Barcode Scanner */}
          <DropdownMenuItem 
            onClick={onScanBarcode}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <ScanLine className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Scan Barcode</p>
              <p className="text-xs text-muted-foreground">Quick lookup or add</p>
            </div>
          </DropdownMenuItem>

          {/* Invoice Scanner - AI */}
          <DropdownMenuItem 
            onClick={() => navigate('/inventory/scan')}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-emerald-50"
          >
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Scan Invoice</p>
              <p className="text-xs text-muted-foreground">AI-powered product extraction</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              AI
            </Badge>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Bulk Actions */}
          <DropdownMenuItem 
            onClick={onBulkImport}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-purple-50"
          >
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Upload className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Bulk Import</p>
              <p className="text-xs text-muted-foreground">Import CSV/Excel</p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => {/* Export action */}}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-indigo-50"
          >
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Download className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Export Data</p>
              <p className="text-xs text-muted-foreground">Download reports</p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Analytics */}
          <DropdownMenuItem 
            onClick={onGenerateReport}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-emerald-50"
          >
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Generate Report</p>
              <p className="text-xs text-muted-foreground">Inventory analytics</p>
            </div>
          </DropdownMenuItem>

          {/* Settings */}
          <DropdownMenuItem 
            onClick={() => navigate('/inventory/manager')}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50"
          >
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Settings className="h-4 w-4 text-slate-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Settings</p>
              <p className="text-xs text-muted-foreground">Manage inventory</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}