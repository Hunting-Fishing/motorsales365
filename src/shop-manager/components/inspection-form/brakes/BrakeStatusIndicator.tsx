
import React from 'react';
import { Check, AlertTriangle, AlertCircle } from "lucide-react";

interface BrakeStatusProps {
  thicknessMM: number;
}

export const getBrakeStatus = (thicknessMM: number) => {
  if (thicknessMM >= 6) {
    return { status: 'good', label: 'Good', color: 'text-green-600', bgColor: 'bg-green-100', icon: <Check className="h-5 w-5" /> };
  } else if (thicknessMM >= 4) {
    return { status: 'fair', label: 'Fair', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: <AlertTriangle className="h-5 w-5" /> };
  } else {
    return { status: 'replace', label: 'Replace', color: 'text-red-600', bgColor: 'bg-red-100', icon: <AlertCircle className="h-5 w-5" /> };
  }
};

export const BrakeStatusIndicator: React.FC<BrakeStatusProps> = ({ thicknessMM }) => {
  const status = getBrakeStatus(thicknessMM);
  
  return (
    <div className={`px-3 py-1 rounded-full font-medium text-sm ${
      status.bgColor} ${
      status.color} border border-white/20 bg-white/90 shadow-md flex items-center`}>
      {status.icon}
      <span className="ml-1">{status.label}</span>
    </div>
  );
};
