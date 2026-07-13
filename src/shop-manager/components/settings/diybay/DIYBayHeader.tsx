
import React from "react";
import { Info } from "lucide-react";

export const DIYBayHeader: React.FC = () => {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">DIY Bay Rental Rates</h2>
      <p className="text-gray-600">
        Configure rates for your DIY rental bays. Set the base rates and bay-specific pricing.
      </p>
      <div className="flex items-center gap-2 mt-2 p-3 bg-blue-50 text-blue-800 rounded-lg">
        <Info className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">
          Changes to the base rate will affect all bays using the default pricing. Bay-specific rates can be customized individually.
        </p>
      </div>
    </div>
  );
};
