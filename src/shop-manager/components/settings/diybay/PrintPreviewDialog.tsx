
import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bay } from "@/services/diybay/diybayService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Printer, RefreshCw, Copy } from "lucide-react";
import { Label } from "@/components/ui/label";
import { printElement } from "@/utils/printUtils";

interface PrintPreviewDialogProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  bays: Bay[];
}

export const PrintPreviewDialog: React.FC<PrintPreviewDialogProps> = ({
  isOpen,
  setIsOpen,
  bays,
}) => {
  const [layout, setLayout] = useState<"list" | "grid" | "table">("grid");
  const [colorScheme, setColorScheme] = useState<"colorful" | "minimal" | "monochrome">("colorful");
  const [scale, setScale] = useState([100]);
  const [baysPerPage, setBaysPerPage] = useState<number>(3);
  const previewRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (previewRef.current) {
      printElement("print-preview-content", "DIY Bay Rates");
    }
  };

  // Calculate how many pages we need based on bays count and bays per page
  const totalPages = Math.ceil(bays.length / baysPerPage);
  const [activePage, setActivePage] = useState(1);

  // Get the bays for the current page
  const getCurrentPageBays = () => {
    const startIndex = (activePage - 1) * baysPerPage;
    return bays.slice(startIndex, startIndex + baysPerPage);
  };

  const getBaysForPage = (pageNumber: number) => {
    const startIndex = (pageNumber - 1) * baysPerPage;
    return bays.slice(startIndex, startIndex + baysPerPage);
  };

  // Reset to first page when bays per page changes
  useEffect(() => {
    setActivePage(1);
  }, [baysPerPage]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Print Preview</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-12 gap-4">
          {/* Left column - settings */}
          <div className="col-span-12 md:col-span-3 space-y-5 border-r pr-4">
            <div className="space-y-2">
              <Label>Layout</Label>
              <Select value={layout} onValueChange={(value: "list" | "grid" | "table") => setLayout(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Color Scheme</Label>
              <Select value={colorScheme} onValueChange={(value: "colorful" | "minimal" | "monochrome") => setColorScheme(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select color scheme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="colorful">Colorful</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="monochrome">Monochrome</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bays Per Page</Label>
              <Select 
                value={baysPerPage.toString()} 
                onValueChange={(value) => setBaysPerPage(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select number of bays per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Bay Per Page</SelectItem>
                  <SelectItem value="2">2 Bays Per Page</SelectItem>
                  <SelectItem value="3">3 Bays Per Page</SelectItem>
                  <SelectItem value="4">4 Bays Per Page</SelectItem>
                  <SelectItem value="6">6 Bays Per Page</SelectItem>
                  <SelectItem value="9">9 Bays Per Page</SelectItem>
                  <SelectItem value={bays.length.toString()}>All Bays</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Scale: {scale[0]}%</Label>
              <Slider
                value={scale}
                onValueChange={(value) => setScale(value)}
                min={50}
                max={150}
                step={10}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Pages</Label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <Badge 
                    key={index} 
                    variant={activePage === index + 1 ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setActivePage(index + 1)}
                  >
                    {index + 1}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="pt-4">
              <Label>Bay Information</Label>
              <div className="space-y-1 mt-2 text-sm">
                <div className="flex items-center">
                  <input type="checkbox" id="show-location" defaultChecked className="mr-2" />
                  <label htmlFor="show-location">Show Location</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="show-rates" defaultChecked className="mr-2" />
                  <label htmlFor="show-rates">Show All Rates</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="show-status" defaultChecked className="mr-2" />
                  <label htmlFor="show-status">Show Status</label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column - preview */}
          <div className="col-span-12 md:col-span-9 border rounded-md overflow-hidden">
            <div className="bg-gray-50 p-2 flex justify-between items-center border-b">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Page {activePage} of {totalPages}
                </span>
                <Badge variant="outline" className="text-xs">
                  {scale[0]}%
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
                  disabled={activePage === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActivePage(prev => Math.min(totalPages, prev + 1))}
                  disabled={activePage === totalPages}
                >
                  Next
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActivePage(1)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div 
              className="overflow-auto h-[500px] p-4 bg-white"
              style={{ 
                transform: `scale(${scale[0] / 100})`, 
                transformOrigin: "top left",
                width: `${10000 / scale[0]}%`,
              }}
            >
              <div ref={previewRef} className="mx-auto" style={{ maxWidth: "800px" }}>
                <div id="print-preview-content">
                  {/* Print Header */}
                  <div className="print-header mb-6">
                    <h1 className="text-2xl font-bold mb-1">DIY Bay Rates</h1>
                    <p className="text-gray-500 text-sm">
                      Printed on: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* Bays Content */}
                  {layout === "grid" && (
                    <div className={`grid grid-cols-${Math.min(3, baysPerPage)} gap-4`}>
                      {getCurrentPageBays().map(bay => (
                        <div 
                          key={bay.id} 
                          className={`
                            card p-4 rounded-lg shadow-sm border
                            ${colorScheme === "colorful" ? "bg-blue-50 border-blue-200" : 
                              colorScheme === "minimal" ? "bg-white border-gray-200" : "bg-gray-100 border-gray-300"}
                          `}
                        >
                          <h3 className={`
                            text-lg font-semibold mb-1
                            ${colorScheme === "colorful" ? "text-blue-700" : 
                              colorScheme === "minimal" ? "text-gray-800" : "text-gray-900"}
                          `}>
                            {bay.bay_name}
                          </h3>
                          
                          {bay.bay_location && (
                            <p className="text-sm text-gray-600 mb-3">
                              Location: {bay.bay_location}
                            </p>
                          )}
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className={`
                              p-2 rounded
                              ${colorScheme === "colorful" ? "bg-blue-100 text-blue-800" : 
                                colorScheme === "minimal" ? "bg-gray-50 text-gray-800" : "bg-white text-gray-800"}
                            `}>
                              <p className="font-medium">Hourly Rate</p>
                              <p className="text-lg font-bold">${bay.hourly_rate.toFixed(2)}</p>
                            </div>
                            
                            <div className={`
                              p-2 rounded
                              ${colorScheme === "colorful" ? "bg-green-100 text-green-800" : 
                                colorScheme === "minimal" ? "bg-gray-50 text-gray-800" : "bg-white text-gray-800"}
                            `}>
                              <p className="font-medium">Daily Rate</p>
                              <p className="text-lg font-bold">
                                ${bay.daily_rate ? bay.daily_rate.toFixed(2) : '0.00'}
                              </p>
                            </div>
                            
                            <div className={`
                              p-2 rounded
                              ${colorScheme === "colorful" ? "bg-purple-100 text-purple-800" : 
                                colorScheme === "minimal" ? "bg-gray-50 text-gray-800" : "bg-white text-gray-800"}
                            `}>
                              <p className="font-medium">Weekly Rate</p>
                              <p className="text-lg font-bold">
                                ${bay.weekly_rate ? bay.weekly_rate.toFixed(2) : '0.00'}
                              </p>
                            </div>
                            
                            <div className={`
                              p-2 rounded
                              ${colorScheme === "colorful" ? "bg-amber-100 text-amber-800" : 
                                colorScheme === "minimal" ? "bg-gray-50 text-gray-800" : "bg-white text-gray-800"}
                            `}>
                              <p className="font-medium">Monthly Rate</p>
                              <p className="text-lg font-bold">
                                ${bay.monthly_rate ? bay.monthly_rate.toFixed(2) : '0.00'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex justify-end">
                            <span className={`
                              text-xs px-2 py-1 rounded-full
                              ${bay.is_active ? 
                                (colorScheme === "colorful" ? "bg-green-100 text-green-800 border border-green-300" : 
                                  "bg-gray-100 text-gray-800 border border-gray-300") : 
                                (colorScheme === "colorful" ? "bg-red-100 text-red-800 border border-red-300" : 
                                  "bg-gray-100 text-gray-800 border border-gray-300")}
                            `}>
                              {bay.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {layout === "list" && (
                    <div className="space-y-4">
                      {getCurrentPageBays().map(bay => (
                        <div 
                          key={bay.id} 
                          className={`
                            card p-4 rounded-lg shadow-sm border
                            ${colorScheme === "colorful" ? "bg-blue-50 border-blue-200" : 
                              colorScheme === "minimal" ? "bg-white border-gray-200" : "bg-gray-100 border-gray-300"}
                          `}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className={`
                                text-xl font-semibold
                                ${colorScheme === "colorful" ? "text-blue-700" : 
                                  colorScheme === "minimal" ? "text-gray-800" : "text-gray-900"}
                              `}>
                                {bay.bay_name}
                              </h3>
                              
                              {bay.bay_location && (
                                <p className="text-sm text-gray-600">
                                  Location: {bay.bay_location}
                                </p>
                              )}
                            </div>
                            
                            <span className={`
                              text-sm px-3 py-1 rounded-full
                              ${bay.is_active ? 
                                (colorScheme === "colorful" ? "bg-green-100 text-green-800 border border-green-300" : 
                                  "bg-gray-100 text-gray-800 border border-gray-300") : 
                                (colorScheme === "colorful" ? "bg-red-100 text-red-800 border border-red-300" : 
                                  "bg-gray-100 text-gray-800 border border-gray-300")}
                            `}>
                              {bay.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 mt-3">
                            <div className={`
                              p-3 rounded
                              ${colorScheme === "colorful" ? "bg-blue-100 text-blue-800" : 
                                colorScheme === "minimal" ? "bg-gray-50 text-gray-800" : "bg-white text-gray-800"}
                            `}>
                              <p className="text-sm font-medium">Hourly Rate</p>
                              <p className="text-xl font-bold">${bay.hourly_rate.toFixed(2)}</p>
                            </div>
                            
                            <div className={`
                              p-3 rounded
                              ${colorScheme === "colorful" ? "bg-green-100 text-green-800" : 
                                colorScheme === "minimal" ? "bg-gray-50 text-gray-800" : "bg-white text-gray-800"}
                            `}>
                              <p className="text-sm font-medium">Daily Rate</p>
                              <p className="text-xl font-bold">
                                ${bay.daily_rate ? bay.daily_rate.toFixed(2) : '0.00'}
                              </p>
                            </div>
                            
                            <div className={`
                              p-3 rounded
                              ${colorScheme === "colorful" ? "bg-purple-100 text-purple-800" : 
                                colorScheme === "minimal" ? "bg-gray-50 text-gray-800" : "bg-white text-gray-800"}
                            `}>
                              <p className="text-sm font-medium">Weekly Rate</p>
                              <p className="text-xl font-bold">
                                ${bay.weekly_rate ? bay.weekly_rate.toFixed(2) : '0.00'}
                              </p>
                            </div>
                            
                            <div className={`
                              p-3 rounded
                              ${colorScheme === "colorful" ? "bg-amber-100 text-amber-800" : 
                                colorScheme === "minimal" ? "bg-gray-50 text-gray-800" : "bg-white text-gray-800"}
                            `}>
                              <p className="text-sm font-medium">Monthly Rate</p>
                              <p className="text-xl font-bold">
                                ${bay.monthly_rate ? bay.monthly_rate.toFixed(2) : '0.00'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {layout === "table" && (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className={colorScheme === "colorful" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}>
                          <th className="border px-4 py-2 text-left">Bay Name</th>
                          <th className="border px-4 py-2 text-left">Location</th>
                          <th className="border px-4 py-2 text-right">Hourly Rate</th>
                          <th className="border px-4 py-2 text-right">Daily Rate</th>
                          <th className="border px-4 py-2 text-right">Weekly Rate</th>
                          <th className="border px-4 py-2 text-right">Monthly Rate</th>
                          <th className="border px-4 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getCurrentPageBays().map((bay, index) => (
                          <tr key={bay.id} className={index % 2 === 0 ? 
                            (colorScheme === "colorful" ? "bg-blue-50" : "bg-gray-50") : "bg-white"}>
                            <td className="border px-4 py-3 font-medium">{bay.bay_name}</td>
                            <td className="border px-4 py-3">{bay.bay_location || 'N/A'}</td>
                            <td className="border px-4 py-3 text-right font-medium">${bay.hourly_rate.toFixed(2)}</td>
                            <td className="border px-4 py-3 text-right">${bay.daily_rate ? bay.daily_rate.toFixed(2) : '0.00'}</td>
                            <td className="border px-4 py-3 text-right">${bay.weekly_rate ? bay.weekly_rate.toFixed(2) : '0.00'}</td>
                            <td className="border px-4 py-3 text-right">${bay.monthly_rate ? bay.monthly_rate.toFixed(2) : '0.00'}</td>
                            <td className="border px-4 py-3 text-center">
                              <span className={`
                                inline-block text-xs px-2 py-1 rounded-full
                                ${bay.is_active ? 
                                  (colorScheme === "colorful" ? "bg-green-100 text-green-800 border border-green-300" : 
                                    "bg-gray-100 text-gray-800 border border-gray-300") : 
                                  (colorScheme === "colorful" ? "bg-red-100 text-red-800 border border-red-300" : 
                                    "bg-gray-100 text-gray-800 border border-gray-300")}
                              `}>
                                {bay.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* For multiple pages, show page number */}
                  {totalPages > 1 && (
                    <div className="text-right mt-4 text-xs text-gray-500">
                      Page {activePage} of {totalPages}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
                
        <DialogFooter className="gap-2 sm:gap-0">
          <div className="text-sm text-gray-500">
            Showing {getCurrentPageBays().length} of {bays.length} bays
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
