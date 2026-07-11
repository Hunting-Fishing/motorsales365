
import React from "react";
import { Bay } from "@/services/diybay/diybayService";

interface BayPrintPreviewProps {
  bays: Bay[];
  layout: "list" | "grid" | "table";
  columns: number;
  scale: number;
  showColors: boolean;
  colorScheme: string;
  showDetails: boolean;
}

export const BayPrintPreview: React.FC<BayPrintPreviewProps> = ({
  bays,
  layout,
  columns,
  scale,
  showColors,
  colorScheme,
  showDetails,
}) => {
  const getColorScheme = () => {
    switch (colorScheme) {
      case "professional":
        return {
          header: "bg-blue-800 text-white",
          active: "bg-blue-100 text-blue-800 border-blue-300",
          inactive: "bg-gray-100 text-gray-700 border-gray-300",
          border: "border-blue-200",
          hourly: "bg-blue-50 text-blue-700",
          daily: "bg-indigo-50 text-indigo-700",
          weekly: "bg-violet-50 text-violet-700",
          monthly: "bg-sky-50 text-sky-700",
          card: "bg-white border-blue-200",
        };
      case "vibrant":
        return {
          header: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
          active: "bg-green-100 text-green-800 border-green-400",
          inactive: "bg-red-100 text-red-800 border-red-300",
          border: "border-purple-200",
          hourly: "bg-pink-100 text-pink-800",
          daily: "bg-purple-100 text-purple-800",
          weekly: "bg-indigo-100 text-indigo-800",
          monthly: "bg-blue-100 text-blue-800",
          card: "bg-white border-purple-300",
        };
      case "calm":
        return {
          header: "bg-green-700 text-white",
          active: "bg-green-100 text-green-800 border-green-300",
          inactive: "bg-gray-100 text-gray-700 border-gray-300",
          border: "border-green-200",
          hourly: "bg-green-50 text-green-700",
          daily: "bg-emerald-50 text-emerald-700",
          weekly: "bg-teal-50 text-teal-700",
          monthly: "bg-cyan-50 text-cyan-700",
          card: "bg-white border-green-200",
        };
      case "monochrome":
        return {
          header: "bg-gray-800 text-white",
          active: "bg-gray-200 text-gray-800 border-gray-400",
          inactive: "bg-gray-100 text-gray-600 border-gray-300",
          border: "border-gray-300",
          hourly: "bg-gray-50 text-gray-700",
          daily: "bg-gray-100 text-gray-700",
          weekly: "bg-gray-50 text-gray-700",
          monthly: "bg-gray-100 text-gray-700",
          card: "bg-white border-gray-300",
        };
      default:
        return {
          header: "bg-blue-600 text-white",
          active: "bg-green-100 text-green-800 border-green-300",
          inactive: "bg-gray-100 text-gray-700 border-gray-300",
          border: "border-blue-200",
          hourly: "bg-blue-50 text-blue-600",
          daily: "bg-green-50 text-green-600",
          weekly: "bg-purple-50 text-purple-600",
          monthly: "bg-amber-50 text-amber-600",
          card: "bg-white border-gray-200",
        };
    }
  };

  const colors = showColors ? getColorScheme() : {
    header: "bg-white border-b text-gray-800",
    active: "bg-white text-gray-800 border-gray-300",
    inactive: "bg-white text-gray-600 border-gray-300",
    border: "border-gray-200",
    hourly: "bg-white text-gray-800 border-gray-300",
    daily: "bg-white text-gray-800 border-gray-300",
    weekly: "bg-white text-gray-800 border-gray-300",
    monthly: "bg-white text-gray-800 border-gray-300",
    card: "bg-white border-gray-300",
  };

  const renderTableView = () => (
    <div style={{ transform: `scale(${scale / 100})`, transformOrigin: 'top left' }} className="w-full">
      <div className="print-header mb-6">
        <h1 className="text-2xl font-bold mb-1">Available Bays</h1>
        <p className="text-sm text-gray-500">Printed on: {new Date().toLocaleDateString()}</p>
      </div>
      
      <table className="w-full border-collapse">
        <thead>
          <tr className={colors.header}>
            <th className="px-4 py-3 text-left">Bay Name</th>
            <th className="px-4 py-3 text-left">Location</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Hourly Rate</th>
            {showDetails && (
              <>
                <th className="px-4 py-3 text-right">Daily Rate</th>
                <th className="px-4 py-3 text-right">Weekly Rate</th>
                <th className="px-4 py-3 text-right">Monthly Rate</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {bays.map((bay) => (
            <tr key={bay.id} className={`border-b ${colors.border}`}>
              <td className="px-4 py-3 font-medium">{bay.bay_name}</td>
              <td className="px-4 py-3">{bay.bay_location || '-'}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${bay.is_active ? colors.active : colors.inactive}`}>
                  {bay.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium">${bay.hourly_rate.toFixed(2)}</td>
              {showDetails && (
                <>
                  <td className="px-4 py-3 text-right">${bay.daily_rate ? bay.daily_rate.toFixed(2) : '0.00'}</td>
                  <td className="px-4 py-3 text-right">${bay.weekly_rate ? bay.weekly_rate.toFixed(2) : '0.00'}</td>
                  <td className="px-4 py-3 text-right">${bay.monthly_rate ? bay.monthly_rate.toFixed(2) : '0.00'}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  const renderGridView = () => {
    const gridColsClass = columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3';
    
    return (
      <div style={{ transform: `scale(${scale / 100})`, transformOrigin: 'top left' }} className="w-full">
        <div className="print-header mb-6">
          <h1 className="text-2xl font-bold mb-1">Available Bays</h1>
          <p className="text-sm text-gray-500">Printed on: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className={`grid ${gridColsClass} gap-4`}>
          {bays.map((bay) => (
            <div key={bay.id} className={`border rounded-md overflow-hidden shadow ${colors.card}`}>
              <div className={`p-3 ${colors.header}`}>
                <h3 className="font-bold">{bay.bay_name}</h3>
                {bay.bay_location && (
                  <p className="text-sm opacity-90 mt-1">{bay.bay_location}</p>
                )}
              </div>
              
              <div className="p-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${bay.is_active ? colors.active : colors.inactive}`}>
                    {bay.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2 rounded ${colors.hourly}`}>
                    <p className="text-xs font-semibold">Hourly Rate</p>
                    <p className="font-bold">${bay.hourly_rate.toFixed(2)}</p>
                  </div>
                  
                  {showDetails && (
                    <>
                      <div className={`p-2 rounded ${colors.daily}`}>
                        <p className="text-xs font-semibold">Daily Rate</p>
                        <p className="font-bold">${bay.daily_rate ? bay.daily_rate.toFixed(2) : '0.00'}</p>
                      </div>
                      
                      <div className={`p-2 rounded ${colors.weekly}`}>
                        <p className="text-xs font-semibold">Weekly Rate</p>
                        <p className="font-bold">${bay.weekly_rate ? bay.weekly_rate.toFixed(2) : '0.00'}</p>
                      </div>
                      
                      <div className={`p-2 rounded ${colors.monthly}`}>
                        <p className="text-xs font-semibold">Monthly Rate</p>
                        <p className="font-bold">${bay.monthly_rate ? bay.monthly_rate.toFixed(2) : '0.00'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderListView = () => (
    <div style={{ transform: `scale(${scale / 100})`, transformOrigin: 'top left' }} className="w-full">
      <div className="print-header mb-6">
        <h1 className="text-2xl font-bold mb-1">Available Bays</h1>
        <p className="text-sm text-gray-500">Printed on: {new Date().toLocaleDateString()}</p>
      </div>
      
      <div className="space-y-4">
        {bays.map((bay) => (
          <div key={bay.id} className={`border rounded-lg p-4 ${colors.card}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold">{bay.bay_name}</h3>
                {bay.bay_location && (
                  <p className="text-sm text-gray-500">{bay.bay_location}</p>
                )}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${bay.is_active ? colors.active : colors.inactive}`}>
                {bay.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-3 rounded ${colors.hourly}`}>
                <p className="text-xs font-semibold">Hourly Rate</p>
                <p className="text-lg font-bold">${bay.hourly_rate.toFixed(2)}</p>
              </div>
              
              {showDetails && (
                <>
                  <div className={`p-3 rounded ${colors.daily}`}>
                    <p className="text-xs font-semibold">Daily Rate</p>
                    <p className="text-lg font-bold">${bay.daily_rate ? bay.daily_rate.toFixed(2) : '0.00'}</p>
                  </div>
                  
                  <div className={`p-3 rounded ${colors.weekly}`}>
                    <p className="text-xs font-semibold">Weekly Rate</p>
                    <p className="text-lg font-bold">${bay.weekly_rate ? bay.weekly_rate.toFixed(2) : '0.00'}</p>
                  </div>
                  
                  <div className={`p-3 rounded ${colors.monthly}`}>
                    <p className="text-xs font-semibold">Monthly Rate</p>
                    <p className="text-lg font-bold">${bay.monthly_rate ? bay.monthly_rate.toFixed(2) : '0.00'}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full print:w-full mx-auto">
      {layout === "table" && renderTableView()}
      {layout === "grid" && renderGridView()}
      {layout === "list" && renderListView()}
    </div>
  );
};
