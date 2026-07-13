
import React from 'react';
import { Loader2 } from 'lucide-react';

interface SettingsLoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SettingsLoadingState: React.FC<SettingsLoadingStateProps> = ({ 
  message = "Loading settings...",
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const containerClasses = {
    sm: 'p-4',
    md: 'p-8',
    lg: 'p-12'
  };

  return (
    <div className={`flex items-center justify-center ${containerClasses[size]} bg-white rounded-lg shadow-sm border border-gray-100`}>
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};
