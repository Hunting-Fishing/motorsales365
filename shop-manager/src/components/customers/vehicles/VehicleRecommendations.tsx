
import React from 'react';
import { CustomerVehicle } from '@/types/customer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, Check, Clock } from 'lucide-react';

// Define standard service intervals based on mileage
const standardServiceIntervals = [
  { mileage: 5000, service: "Oil Change & Tire Rotation" },
  { mileage: 15000, service: "Air Filter Replacement" },
  { mileage: 30000, service: "Fuel Filter Replacement" },
  { mileage: 60000, service: "Timing Belt Replacement" },
  { mileage: 60000, service: "Brake Fluid Flush" },
];

interface VehicleRecommendationsProps {
  vehicle: CustomerVehicle;
}

export const VehicleRecommendations: React.FC<VehicleRecommendationsProps> = ({ vehicle }) => {
  // In a real app, you would have actual mileage data and service history
  // For this demo, we'll just show some standard recommendations
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
            Recommended Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Due Now */}
            <div className="border border-red-200 bg-red-50 rounded-md p-4">
              <h3 className="text-md font-medium text-red-800 flex items-center mb-2">
                <Clock className="mr-2 h-4 w-4" /> Due Now
              </h3>
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span>Oil Change & Filter</span>
                  <span className="text-sm text-gray-600">Every 5,000 miles</span>
                </li>
                <li className="flex justify-between">
                  <span>Tire Rotation</span>
                  <span className="text-sm text-gray-600">Every 5,000 miles</span>
                </li>
              </ul>
            </div>
            
            {/* Coming Up */}
            <div className="border border-amber-200 bg-amber-50 rounded-md p-4">
              <h3 className="text-md font-medium text-amber-800 flex items-center mb-2">
                <Clock className="mr-2 h-4 w-4" /> Coming Up
              </h3>
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span>Cabin Air Filter Replacement</span>
                  <span className="text-sm text-gray-600">Every 15,000 miles</span>
                </li>
                <li className="flex justify-between">
                  <span>Brake Inspection</span>
                  <span className="text-sm text-gray-600">Every 10,000 miles</span>
                </li>
              </ul>
            </div>
            
            {/* Long Term */}
            <div className="border border-blue-200 bg-blue-50 rounded-md p-4">
              <h3 className="text-md font-medium text-blue-800 flex items-center mb-2">
                <Clock className="mr-2 h-4 w-4" /> Long Term
              </h3>
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span>Transmission Fluid Change</span>
                  <span className="text-sm text-gray-600">Every 60,000 miles</span>
                </li>
                <li className="flex justify-between">
                  <span>Timing Belt Replacement</span>
                  <span className="text-sm text-gray-600">Every 90,000 miles</span>
                </li>
              </ul>
            </div>
            
            {/* Completed */}
            <div className="border border-green-200 bg-green-50 rounded-md p-4">
              <h3 className="text-md font-medium text-green-800 flex items-center mb-2">
                <Check className="mr-2 h-4 w-4" /> Recently Completed
              </h3>
              <ul className="space-y-2">
                {vehicle.last_service_date ? (
                  <li className="flex justify-between">
                    <span>Last Service</span>
                    <span className="text-sm text-gray-600">
                      {new Date(vehicle.last_service_date).toLocaleDateString()}
                    </span>
                  </li>
                ) : (
                  <li>No recent service records found.</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
