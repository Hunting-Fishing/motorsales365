
import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '@/types/notification';
import { Check, Info, AlertTriangle, CheckCircle2, XCircle, X, Clock, ArrowUp, User, FileText, Package, CreditCard, Users, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClear: (id: string) => void;
}

export function NotificationItem({ notification, onMarkAsRead, onClear }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClear(notification.id);
  };

  // Format the timestamp
  const formattedTime = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });

  // Determine the icon based on notification type and category
  const getIcon = () => {
    // First, determine the icon based on category
    let categoryIcon;
    switch (notification.category) {
      case 'work-order':
        categoryIcon = <FileText className="h-4 w-4" />;
        break;
      case 'inventory':
        categoryIcon = <Package className="h-4 w-4" />;
        break;
      case 'invoice':
        categoryIcon = <CreditCard className="h-4 w-4" />;
        break;
      case 'customer':
        categoryIcon = <User className="h-4 w-4" />;
        break;
      case 'team':
        categoryIcon = <Users className="h-4 w-4" />;
        break;
      case 'chat':
        categoryIcon = <MessageSquare className="h-4 w-4" />;
        break;
      default:
        categoryIcon = null;
    }

    // Then, determine the icon based on type
    let typeIcon;
    switch (notification.type) {
      case 'info':
        typeIcon = <Info className="h-4 w-4 text-blue-500" />;
        break;
      case 'warning':
        typeIcon = <AlertTriangle className="h-4 w-4 text-amber-500" />;
        break;
      case 'success':
        typeIcon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
        break;
      case 'error':
        typeIcon = <XCircle className="h-4 w-4 text-red-500" />;
        break;
      default:
        typeIcon = <Info className="h-4 w-4 text-blue-500" />;
    }

    // If we have both, use the type icon
    return typeIcon || categoryIcon || <Info className="h-4 w-4 text-blue-500" />;
  };

  const getPriorityBadge = () => {
    if (!notification.priority || notification.priority === 'medium') return null;
    
    if (notification.priority === 'high') {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 ml-2 px-1.5 py-0 h-4 text-[10px]">
          <ArrowUp className="h-2.5 w-2.5 mr-0.5" />
          High
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-100 ml-2 px-1.5 py-0 h-4 text-[10px]">
        Low
      </Badge>
    );
  };

  const Content = () => (
    <div className={cn(
      "flex items-start p-3 gap-3 border-b border-slate-100 hover:bg-slate-50 transition-colors",
      !notification.read && "bg-slate-50",
    )}>
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <p className={cn(
              "text-sm",
              !notification.read ? "font-semibold" : "font-medium"
            )}>
              {notification.title}
            </p>
            {getPriorityBadge()}
          </div>
          <button 
            onClick={handleClear}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 mb-1 line-clamp-2">{notification.message}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formattedTime}
          </p>
          {notification.category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {notification.category}
            </Badge>
          )}
        </div>
        {!notification.read && (
          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full absolute top-3 right-3"></span>
        )}
      </div>
    </div>
  );

  return notification.link ? (
    <Link to={notification.link} className="block" onClick={handleClick}>
      <Content />
    </Link>
  ) : (
    <div onClick={handleClick}>
      <Content />
    </div>
  );
}
