
import React from "react";
import { CompanyTab } from "@/components/settings/CompanyTab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const CompanySettings = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/settings")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Company Settings</h1>
          <p className="text-muted-foreground">
            Manage your company information, contact details, and business profile
          </p>
        </div>
      </div>

      {/* Instructions Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200">
            Company Information Management
          </CardTitle>
          <CardDescription className="text-blue-600 dark:text-blue-300">
            Keep your company information up to date to ensure consistent branding and accurate contact details across your application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">✓ What you can manage here:</h4>
              <ul className="space-y-1 text-blue-600 dark:text-blue-300">
                <li>• Company name and business type</li>
                <li>• Industry selection with custom options</li>
                <li>• Contact information and address</li>
                <li>• Business hours and availability</li>
                <li>• Tax ID and legal information</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">📋 Tips for best results:</h4>
              <ul className="space-y-1 text-blue-600 dark:text-blue-300">
                <li>• Keep contact information current</li>
                <li>• Add a company description for customers</li>
                <li>• Set accurate business hours</li>
                <li>• Use the custom industry option if needed</li>
                <li>• Include your website URL for credibility</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Settings Form */}
      <CompanyTab />
    </div>
  );
};

export default CompanySettings;
