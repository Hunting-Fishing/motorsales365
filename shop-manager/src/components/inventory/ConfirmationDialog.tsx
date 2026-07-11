import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2, Archive, Tag, Edit3 } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'delete' | 'archive' | 'edit' | 'tag' | 'default';
  itemCount?: number;
  loading?: boolean;
}

const typeConfig = {
  delete: {
    icon: Trash2,
    iconColor: 'text-red-500',
    confirmVariant: 'destructive' as const,
  },
  archive: {
    icon: Archive,
    iconColor: 'text-yellow-500',
    confirmVariant: 'default' as const,
  },
  edit: {
    icon: Edit3,
    iconColor: 'text-blue-500',
    confirmVariant: 'default' as const,
  },
  tag: {
    icon: Tag,
    iconColor: 'text-green-500',
    confirmVariant: 'default' as const,
  },
  default: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    confirmVariant: 'default' as const,
  },
};

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'default',
  itemCount,
  loading = false,
}: ConfirmationDialogProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="animate-in fade-in-50 zoom-in-95 duration-200">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full bg-background border ${config.iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">
                {title}
                {itemCount && itemCount > 1 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({itemCount} items)
                  </span>
                )}
              </AlertDialogTitle>
            </div>
          </div>
        </AlertDialogHeader>
        
        <AlertDialogDescription className="text-left text-muted-foreground leading-relaxed">
          {description}
        </AlertDialogDescription>
        
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel 
            onClick={onClose}
            disabled={loading}
            className="transition-all duration-200 hover:scale-105"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={`transition-all duration-200 hover:scale-105 min-w-[80px] ${
              config.confirmVariant === 'destructive' 
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                : ''
            }`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}