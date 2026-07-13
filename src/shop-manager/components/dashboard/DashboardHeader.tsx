
import { Button } from "@/components/ui/button";
import { Calendar, Download, FileSpreadsheet, BarChart3, RefreshCw } from "lucide-react";

export function DashboardHeader() {
  return (
    <div className="hidden md:flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-slate-600 text-lg">
          Monitor your shop's performance and key metrics
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
            <Calendar className="mr-2 h-4 w-4 text-blue-600" />
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm" className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
            <RefreshCw className="mr-2 h-4 w-4 text-emerald-600" />
            Refresh
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
            <BarChart3 className="mr-2 h-4 w-4 text-purple-600" />
            Analytics
          </Button>
          <Button variant="outline" size="sm" className="bg-white shadow-sm hover:shadow-md transition-all duration-200">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-orange-600" />
            Export Report
          </Button>
        </div>
      </div>
    </div>
  );
}
