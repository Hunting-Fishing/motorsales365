import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Annotation {
  id: string;
  x: number;
  y: number;
  label: string;
  status: 'pass' | 'fail' | 'na';
  notes?: string;
}

interface InteractiveVesselPhotoProps {
  imageUrl: string;
  annotations: Annotation[];
  onAddAnnotation?: (annotation: Omit<Annotation, 'id'>) => void;
  onRemoveAnnotation?: (id: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function InteractiveVesselPhoto({
  imageUrl,
  annotations,
  onAddAnnotation,
  onRemoveAnnotation,
  readOnly = false,
  className
}: InteractiveVesselPhotoProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // For manual annotations, let parent handle with a dialog
    if (onAddAnnotation) {
      onAddAnnotation({ x, y, label: 'Custom', status: 'fail', notes: '' });
    }
  };

  const getAnnotationColor = (status: string) => {
    switch (status) {
      case 'fail':
        return 'bg-red-500 border-red-600 hover:bg-red-600';
      case 'pass':
        return 'bg-green-500 border-green-600 hover:bg-green-600';
      case 'na':
        return 'bg-gray-400 border-gray-500 hover:bg-gray-500';
      default:
        return 'bg-yellow-500 border-yellow-600 hover:bg-yellow-600';
    }
  };

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Vessel Diagram</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!readOnly && (
        <p className="text-sm text-muted-foreground mb-3">
          Click on the vessel diagram to add a manual annotation, or failed items will auto-highlight.
        </p>
      )}

      <div className="relative overflow-auto max-h-[600px] border rounded-lg bg-muted/30">
        <div
          ref={imageRef}
          className="relative inline-block min-w-full"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            cursor: readOnly ? 'default' : 'crosshair'
          }}
          onClick={handleImageClick}
        >
          <img
            src={imageUrl}
            alt="Vessel diagram"
            className="w-full h-auto pointer-events-none"
            draggable={false}
          />

          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              className="absolute"
              style={{
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div
                className={cn(
                  "relative w-8 h-8 rounded-full border-2 cursor-pointer transition-all flex items-center justify-center",
                  getAnnotationColor(annotation.status),
                  selectedAnnotation === annotation.id && "ring-4 ring-primary/50 scale-125"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAnnotation(
                    selectedAnnotation === annotation.id ? null : annotation.id
                  );
                }}
              >
                <span className="text-xs font-bold text-white">!</span>
              </div>

              {selectedAnnotation === annotation.id && (
                <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-10 w-64">
                  <Card className="p-3 shadow-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-sm">{annotation.label}</h4>
                        <Badge
                          variant={annotation.status === 'fail' ? 'destructive' : 'default'}
                          className="mt-1"
                        >
                          {annotation.status.toUpperCase()}
                        </Badge>
                      </div>
                      {!readOnly && onRemoveAnnotation && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveAnnotation(annotation.id);
                            setSelectedAnnotation(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {annotation.notes && (
                      <p className="text-xs text-muted-foreground mt-2">{annotation.notes}</p>
                    )}
                  </Card>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          Failed
        </Badge>
        <Badge variant="outline" className="gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          Passed
        </Badge>
        <Badge variant="outline" className="gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          N/A
        </Badge>
      </div>
    </Card>
  );
}
