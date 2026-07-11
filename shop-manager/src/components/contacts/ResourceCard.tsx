import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, StarOff, ExternalLink, MoreVertical, Pencil, Trash2,
  Globe, FileText, Video, Wrench, Plug, Layout
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Resource } from '@/types/contacts';

interface ResourceCardProps {
  resource: Resource;
  onEdit: (resource: Resource) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onAccess: (resource: Resource) => void;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  website: Globe,
  document: FileText,
  video: Video,
  tool: Wrench,
  api: Plug,
  portal: Layout,
};

const typeColors: Record<string, string> = {
  website: 'bg-blue-500/10 text-blue-500',
  document: 'bg-amber-500/10 text-amber-500',
  video: 'bg-red-500/10 text-red-500',
  tool: 'bg-green-500/10 text-green-500',
  api: 'bg-purple-500/10 text-purple-500',
  portal: 'bg-cyan-500/10 text-cyan-500',
};

export function ResourceCard({ resource, onEdit, onDelete, onToggleFavorite, onAccess }: ResourceCardProps) {
  const IconComponent = typeIcons[resource.resource_type] || Globe;

  const handleOpen = () => {
    if (resource.url) {
      onAccess(resource);
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div 
            className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: resource.category?.color ? `${resource.category.color}20` : 'hsl(var(--primary) / 0.1)' }}
          >
            <IconComponent 
              className="h-7 w-7" 
              style={{ color: resource.category?.color || 'hsl(var(--primary))' }}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground truncate">{resource.name}</h3>
                {resource.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {resource.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onToggleFavorite(resource.id, !resource.is_favorite)}
                >
                  {resource.is_favorite ? (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  ) : (
                    <StarOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(resource)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(resource.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {resource.url && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
                onClick={handleOpen}
              >
                <ExternalLink className="h-4 w-4" />
                Open Resource
              </Button>
            )}
            
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={typeColors[resource.resource_type]}>
                <IconComponent className="h-3 w-3 mr-1" />
                {resource.resource_type}
              </Badge>
              {resource.category && (
                <Badge 
                  variant="outline"
                  style={{ borderColor: resource.category.color, color: resource.category.color }}
                >
                  {resource.category.name}
                </Badge>
              )}
              {resource.access_count > 0 && (
                <span className="text-xs text-muted-foreground">
                  {resource.access_count} views
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
