import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Eye, 
  Filter,
  Search,
  MoreHorizontal,
  Grid3x3,
  List,
  Table as TableIcon
} from 'lucide-react';
import { ViewMode } from '@/contexts/InventoryViewContext';

interface ResponsiveBreakpointIndicatorProps {
  currentViewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
}

export function ResponsiveBreakpointIndicator({ 
  currentViewMode, 
  onViewModeChange,
  isFilterOpen,
  onToggleFilter
}: ResponsiveBreakpointIndicatorProps) {
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const getIcon = () => {
    switch (screenSize) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getOptimalViewModes = () => {
    switch (screenSize) {
      case 'mobile': 
        return [
          { mode: 'cards' as ViewMode, icon: Grid3x3, label: 'Cards', recommended: true },
          { mode: 'list' as ViewMode, icon: List, label: 'List', recommended: false }
        ];
      case 'tablet':
        return [
          { mode: 'cards' as ViewMode, icon: Grid3x3, label: 'Cards', recommended: true },
          { mode: 'grid' as ViewMode, icon: Grid3x3, label: 'Grid', recommended: true },
          { mode: 'list' as ViewMode, icon: List, label: 'List', recommended: false },
          { mode: 'table' as ViewMode, icon: TableIcon, label: 'Table', recommended: false }
        ];
      default:
        return [
          { mode: 'table' as ViewMode, icon: TableIcon, label: 'Table', recommended: true },
          { mode: 'grid' as ViewMode, icon: Grid3x3, label: 'Grid', recommended: true },
          { mode: 'cards' as ViewMode, icon: Grid3x3, label: 'Cards', recommended: false },
          { mode: 'list' as ViewMode, icon: List, label: 'List', recommended: false }
        ];
    }
  };

  const viewModes = getOptimalViewModes();

  return (
    <>
      {/* Mobile/Tablet Compact Controls */}
      {screenSize !== 'desktop' && (
        <Card className="mb-4 md:hidden">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getIcon()}
                <Badge variant="outline" className="text-xs">
                  {screenSize}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant={isFilterOpen ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleFilter}
                  className="h-8"
                >
                  <Filter className="h-3 w-3" />
                </Button>
                
                {viewModes.map(({ mode, icon: Icon, recommended }) => (
                  <Button
                    key={mode}
                    variant={currentViewMode === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => onViewModeChange(mode)}
                    className={`h-8 ${recommended ? 'border-green-300' : ''}`}
                  >
                    <Icon className="h-3 w-3" />
                    {recommended && screenSize === 'mobile' && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1">✓</Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop View Mode Indicator */}
      {screenSize === 'desktop' && (
        <div className="hidden md:flex items-center space-x-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {getIcon()}
            <span>Desktop View</span>
          </div>
          
          <div className="flex items-center space-x-1">
            {viewModes.map(({ mode, icon: Icon, label, recommended }) => (
              <Button
                key={mode}
                variant={currentViewMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => onViewModeChange(mode)}
                className={`h-8 ${recommended ? 'border-green-300 bg-green-50' : ''}`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {label}
                {recommended && (
                  <Badge variant="secondary" className="ml-1 text-xs">Optimal</Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Development Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-20 left-4 z-40">
          <Card className="bg-black/80 text-white border-gray-600">
            <CardContent className="p-2 text-xs">
              <div className="flex items-center space-x-2">
                {getIcon()}
                <span>{screenSize}</span>
                <span>•</span>
                <span>{window.innerWidth}px</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}