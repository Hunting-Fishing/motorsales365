
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface SettingsCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  color?: string;
}

export function SettingsCard({ 
  title, 
  description, 
  icon: Icon, 
  path,
  color = "blue" 
}: SettingsCardProps) {
  // Map of color schemes for different card types
  const colorSchemes: Record<string, { bg: string, icon: string, border: string }> = {
    blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200" },
    green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-200" },
    purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-200" },
    red: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-200" },
    yellow: { bg: "bg-yellow-50", icon: "text-yellow-600", border: "border-yellow-200" },
    indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", border: "border-indigo-200" },
  };

  const colors = colorSchemes[color] || colorSchemes.blue;

  return (
    <Link to={path} className="block">
      <Card className={`transition-all hover:shadow-md hover:${colors.border} h-full border border-gray-100`}>
        <CardContent className="p-4 flex items-start">
          <div className={`${colors.bg} p-3 rounded-full mr-4`}>
            <Icon className={`h-5 w-5 ${colors.icon}`} />
          </div>
          <div>
            <h3 className="font-medium mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
