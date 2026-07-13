
import React from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCompany } from "@/contexts/CompanyContext";

export function SidebarLogo() {
  const { isOpen } = useSidebar();
  const { companyName, logoUrl } = useCompany();
  
  // Generate initials from company name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };
  
  return (
    <Link to="/">
      <div className="flex items-center gap-2 font-semibold">
        <Avatar className={`${!isOpen ? "h-9 w-9" : "h-8 w-8"} transition-all duration-300`}>
          <AvatarImage src={logoUrl || "/images/ab365-logo.png"} alt={companyName} />
          <AvatarFallback className="bg-purple-600 text-white">
            {getInitials(companyName)}
          </AvatarFallback>
        </Avatar>
        {isOpen && <span className="text-white">{companyName}</span>}
      </div>
    </Link>
  );
}
