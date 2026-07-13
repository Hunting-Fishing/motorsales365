
import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { TagIcon, Wrench, ShieldCheck, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

type TagType = 'work-order' | 'part' | 'warranty' | 'job';

interface TaggedItemProps {
  type: TagType;
  id: string;
  className?: string;
}

export const TaggedItem: React.FC<TaggedItemProps> = ({ type, id, className }) => {
  // Determine icon and route based on tag type
  const getTagDetails = () => {
    switch (type) {
      case 'work-order':
        return {
          icon: <FileText className="h-3 w-3 mr-1" />,
          label: `WO-${id}`,
          route: `/work-orders/${id}`,
          color: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
        };
      case 'part':
        return {
          icon: <Wrench className="h-3 w-3 mr-1" />,
          label: `Part-${id}`,
          route: `/inventory/parts/${id}`,
          color: 'bg-green-100 text-green-800 hover:bg-green-200'
        };
      case 'warranty':
        return {
          icon: <ShieldCheck className="h-3 w-3 mr-1" />,
          label: `Warranty-${id}`,
          route: `/warranties/${id}`,
          color: 'bg-purple-100 text-purple-800 hover:bg-purple-200'
        };
      case 'job':
        return {
          icon: <TagIcon className="h-3 w-3 mr-1" />,
          label: `Job-${id}`,
          route: `/jobs/${id}`,
          color: 'bg-amber-100 text-amber-800 hover:bg-amber-200'
        };
      default:
        return {
          icon: <TagIcon className="h-3 w-3 mr-1" />,
          label: id,
          route: '#',
          color: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        };
    }
  };

  const { icon, label, route, color } = getTagDetails();

  return (
    <Link to={route} className="inline-block">
      <Badge 
        variant="outline" 
        className={cn(
          'flex items-center text-xs px-2 py-0.5 mr-1 mb-1 cursor-pointer transition-colors',
          color,
          className
        )}
      >
        {icon}
        {label}
      </Badge>
    </Link>
  );
};
