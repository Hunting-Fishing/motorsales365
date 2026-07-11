import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Wrench, Package, FileText, Truck } from 'lucide-react';
import { ChevronDown } from 'lucide-react';

interface QuickAddDropdownProps {
  onAddItem: (type: 'labor' | 'parts' | 'sublet' | 'note') => void;
  disabled?: boolean;
}

export function QuickAddDropdown({ onAddItem, disabled = false }: QuickAddDropdownProps) {
  const menuItems = [
    {
      type: 'labor' as const,
      label: 'Labor',
      icon: Wrench,
      description: 'Add labor service item'
    },
    {
      type: 'parts' as const,
      label: 'Parts',
      icon: Package,
      description: 'Add parts or materials'
    },
    {
      type: 'sublet' as const,
      label: 'Sublet/Misc',
      icon: Truck,
      description: 'Add subcontractor or miscellaneous item'
    },
    {
      type: 'note' as const,
      label: 'Note',
      icon: FileText,
      description: 'Add note or comment (no charge)'
    }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" disabled={disabled} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Item
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {menuItems.map((item, index) => (
          <div key={item.type}>
            <DropdownMenuItem
              onClick={() => onAddItem(item.type)}
              className="cursor-pointer group"
            >
              <item.icon className="w-4 h-4 mr-3 text-muted-foreground group-hover:text-foreground" />
              <div className="flex flex-col">
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
            </DropdownMenuItem>
            {index < menuItems.length - 1 && <DropdownMenuSeparator />}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}