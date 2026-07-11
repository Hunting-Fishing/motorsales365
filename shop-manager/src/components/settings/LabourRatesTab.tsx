
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, DollarSign } from "lucide-react";
import { useLabourRates } from "@/hooks/useLabourRates";

export function LabourRatesTab() {
  const { 
    rates, 
    loading, 
    saving, 
    hasChanges, 
    handleInputChange, 
    saveRates 
  } = useLabourRates();

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-gray-100 shadow-md rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <CardTitle className="text-blue-700">Labour Rates</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="h-32 flex items-center justify-center">
                <p>Loading labour rates...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-gray-100 shadow-md rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <CardTitle className="text-blue-700">Labour Rates</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="standard_rate" className="text-sm font-medium flex items-center gap-2">
                  <span className="inline-flex p-1.5 bg-blue-100 text-blue-700 rounded-full">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  Standard Rate ($/hour)
                </Label>
                <Input 
                  id="standard_rate" 
                  type="number" 
                  value={rates.standard_rate} 
                  onChange={(e) => handleInputChange('standard_rate', e.target.value)} 
                  className="w-full border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="diagnostic_rate" className="text-sm font-medium flex items-center gap-2">
                  <span className="inline-flex p-1.5 bg-purple-100 text-purple-700 rounded-full">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  Diagnostic Rate ($/hour)
                </Label>
                <Input 
                  id="diagnostic_rate" 
                  type="number" 
                  value={rates.diagnostic_rate} 
                  onChange={(e) => handleInputChange('diagnostic_rate', e.target.value)} 
                  className="w-full border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emergency_rate" className="text-sm font-medium flex items-center gap-2">
                  <span className="inline-flex p-1.5 bg-red-100 text-red-700 rounded-full">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  Emergency/After Hours Rate ($/hour)
                </Label>
                <Input 
                  id="emergency_rate" 
                  type="number" 
                  value={rates.emergency_rate} 
                  onChange={(e) => handleInputChange('emergency_rate', e.target.value)} 
                  className="w-full border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="warranty_rate" className="text-sm font-medium flex items-center gap-2">
                  <span className="inline-flex p-1.5 bg-green-100 text-green-700 rounded-full">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  Warranty Work Rate ($/hour)
                </Label>
                <Input 
                  id="warranty_rate" 
                  type="number" 
                  value={rates.warranty_rate} 
                  onChange={(e) => handleInputChange('warranty_rate', e.target.value)} 
                  className="w-full border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="internal_rate" className="text-sm font-medium flex items-center gap-2">
                  <span className="inline-flex p-1.5 bg-yellow-100 text-yellow-700 rounded-full">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  Internal Work Rate ($/hour)
                </Label>
                <Input 
                  id="internal_rate" 
                  type="number" 
                  value={rates.internal_rate} 
                  onChange={(e) => handleInputChange('internal_rate', e.target.value)} 
                  className="w-full border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button 
                onClick={saveRates} 
                disabled={saving || !hasChanges}
                className={`rounded-full px-6 ${hasChanges 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-100 text-gray-400'}`}
              >
                {saving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {hasChanges ? "Save Changes" : "No Changes"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

