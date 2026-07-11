import React from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualizedList<T>({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem, 
  overscan = 5,
  className 
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const scrollElementRef = React.useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = React.useMemo(() => {
    const result = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        item: items[i],
        offsetY: i * itemHeight,
      });
    }
    return result;
  }, [items, startIndex, endIndex, itemHeight]);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ index, item, offsetY }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Virtualized Table Row Component
interface VirtualizedTableRowProps {
  items: any[];
  columns: any[];
  rowHeight?: number;
  containerHeight?: number;
  onRowClick?: (item: any) => void;
  className?: string;
}

export function VirtualizedTableRows({ 
  items, 
  columns, 
  rowHeight = 60, 
  containerHeight = 400,
  onRowClick,
  className 
}: VirtualizedTableRowProps) {
  const renderRow = React.useCallback((item: any, index: number) => (
    <div
      className={`
        flex items-center border-b border-border/50 hover:bg-muted/50 cursor-pointer
        transition-colors duration-150
        ${className}
      `}
      onClick={() => onRowClick?.(item)}
      style={{ minHeight: rowHeight }}
    >
      {columns.map((column) => (
        <div
          key={column.id}
          className={`
            px-4 py-2 text-sm truncate
            ${column.className || ''}
          `}
          style={{ 
            width: column.width || 'auto',
            minWidth: column.minWidth || '100px',
            maxWidth: column.maxWidth || 'none'
          }}
        >
          {column.render ? column.render(item[column.accessor], item, index) : item[column.accessor]}
        </div>
      ))}
    </div>
  ), [columns, onRowClick, rowHeight, className]);

  return (
    <VirtualizedList
      items={items}
      itemHeight={rowHeight}
      containerHeight={containerHeight}
      renderItem={renderRow}
      overscan={10}
      className="border rounded-lg"
    />
  );
}

// Performance Monitor Hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = React.useState({
    renderTime: 0,
    memoryUsage: 0,
    fps: 0,
  });

  const measureRenderTime = React.useCallback((fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    setMetrics(prev => ({ ...prev, renderTime: end - start }));
  }, []);

  React.useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        setMetrics(prev => ({ 
          ...prev, 
          fps: Math.round((frameCount * 1000) / (currentTime - lastTime))
        }));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };

    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024)
        }));
      }
    };

    measureFPS();
    const memoryInterval = setInterval(measureMemory, 5000);

    return () => clearInterval(memoryInterval);
  }, []);

  return { metrics, measureRenderTime };
}

// Performance Indicator Component
export function PerformanceIndicator() {
  const { metrics } = usePerformanceMonitor();
  const [isVisible, setIsVisible] = React.useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-black/80 text-white text-xs px-2 py-1 rounded"
      >
        Perf
      </button>
      
      {isVisible && (
        <div className="absolute bottom-8 left-0 bg-black/90 text-white text-xs p-2 rounded shadow-lg min-w-32">
          <div>FPS: {metrics.fps}</div>
          <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
          <div>Memory: {metrics.memoryUsage}MB</div>
        </div>
      )}
    </div>
  );
}

// Lazy Loading Hook
export function useLazyLoading<T>(
  items: T[],
  pageSize: number = 50
) {
  const [loadedItems, setLoadedItems] = React.useState<T[]>([]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);

  const loadMore = React.useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    // Simulate async loading delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    const newItems = items.slice(startIndex, endIndex);
    
    setLoadedItems(prev => [...prev, ...newItems]);
    setCurrentPage(prev => prev + 1);
    setIsLoading(false);
  }, [items, pageSize, currentPage, isLoading]);

  const hasMore = React.useMemo(() => {
    return loadedItems.length < items.length;
  }, [loadedItems.length, items.length]);

  // Load initial page
  React.useEffect(() => {
    if (loadedItems.length === 0 && items.length > 0) {
      loadMore();
    }
  }, [items.length, loadedItems.length, loadMore]);

  // Reset when items change
  React.useEffect(() => {
    setLoadedItems([]);
    setCurrentPage(0);
  }, [items]);

  return { loadedItems, loadMore, hasMore, isLoading };
}

// Intersection Observer Hook for Infinite Scroll
export function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const targetRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [callback, options]);

  return targetRef;
}