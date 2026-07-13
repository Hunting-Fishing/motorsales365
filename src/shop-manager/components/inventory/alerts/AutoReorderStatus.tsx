
import React from 'react';
import { AutoReorderSettings } from '@/types/inventory';
import { Clock } from 'lucide-react';

interface AutoReorderStatusProps {
  settings: AutoReorderSettings;
}

const AutoReorderStatus: React.FC<AutoReorderStatusProps> = ({ settings }) => {
  if (!settings || !settings.enabled) return null;
  
  return (
    <div className="flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
      <Clock className="h-3 w-3 mr-1" />
      <span>Auto {settings.quantity} @ {settings.threshold}</span>
    </div>
  );
};

export default AutoReorderStatus;
