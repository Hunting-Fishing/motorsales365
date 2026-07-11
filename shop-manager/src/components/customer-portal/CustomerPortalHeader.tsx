
import { Button } from "@/components/ui/button";
import { Download, Printer, FileText, LogOut } from "lucide-react";
import { printElement } from "@/utils/printUtils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface CustomerPortalHeaderProps {
  customerName: string;
}

export function CustomerPortalHeader({ customerName }: CustomerPortalHeaderProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  
  const handlePrint = () => {
    if (activeTab) {
      printElement(`portal-${activeTab}`, `${customerName} - ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`);
    } else {
      printElement('portal-content', `${customerName} - Customer Portal`);
    }
  };
  
  const handleDownloadServiceHistory = () => {
    // In a real implementation, this would generate and download 
    // a PDF or CSV of the customer's service history
    alert("This would download your complete service history as a PDF");
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Clear any auth-related storage to prevent auth limbo
      const cleanupAuthState = () => {
        localStorage.removeItem('supabase.auth.token');
        // Remove all Supabase auth keys from localStorage
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        // Remove from sessionStorage if in use
        Object.keys(sessionStorage || {}).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
      };
      
      // Clean up first
      cleanupAuthState();
      
      // Sign out (global scope)
      await supabase.auth.signOut({ scope: 'global' });
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      // Navigate to login page with replace to prevent going back
      navigate('/login', { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {customerName}</h1>
        <p className="text-gray-600">Access your automotive service information</p>
      </div>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={handleDownloadServiceHistory}
        >
          <Download className="h-4 w-4" />
          Download History
        </Button>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Request Quote
        </Button>
        <Button 
          variant="destructive" 
          className="flex items-center gap-2"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="h-4 w-4" />
          {isLoggingOut ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </div>
  );
}
