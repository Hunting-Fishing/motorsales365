import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react';
import { CompanyInfo } from '@/services/settings/companyService';

interface CompanyValidationStatusProps {
  companyInfo: CompanyInfo;
}

interface ValidationItem {
  field: string;
  label: string;
  status: 'complete' | 'warning' | 'missing' | 'info';
  message: string;
  required: boolean;
}

export function CompanyValidationStatus({ companyInfo }: CompanyValidationStatusProps) {
  const validationItems: ValidationItem[] = [
    {
      field: 'name',
      label: 'Company Name',
      status: companyInfo.name ? 'complete' : 'missing',
      message: companyInfo.name ? 'Company name is set' : 'Company name is required',
      required: true,
    },
    {
      field: 'business_type',
      label: 'Business Type',
      status: companyInfo.business_type ? 'complete' : 'missing',
      message: companyInfo.business_type ? `Set as ${companyInfo.business_type}` : 'Business type is required for compliance',
      required: true,
    },
    {
      field: 'industry',
      label: 'Industry',
      status: companyInfo.industry ? 'complete' : 'missing',
      message: companyInfo.industry ? `Set as ${companyInfo.industry}` : 'Industry helps with categorization',
      required: true,
    },
    {
      field: 'phone',
      label: 'Phone Number',
      status: companyInfo.phone ? 'complete' : 'warning',
      message: companyInfo.phone ? 'Phone number is set' : 'Phone number recommended for customer contact',
      required: false,
    },
    {
      field: 'email',
      label: 'Email Address',
      status: companyInfo.email ? 'complete' : 'warning',
      message: companyInfo.email ? 'Email address is set' : 'Email address recommended for communications',
      required: false,
    },
    {
      field: 'address',
      label: 'Business Address',
      status: (companyInfo.address && companyInfo.city && companyInfo.state) 
        ? 'complete' 
        : companyInfo.address || companyInfo.city || companyInfo.state 
        ? 'warning' 
        : 'info',
      message: (companyInfo.address && companyInfo.city && companyInfo.state)
        ? 'Complete address is set'
        : (companyInfo.address || companyInfo.city || companyInfo.state)
        ? 'Partial address - consider completing all fields'
        : 'Address helps with local business presence',
      required: false,
    },
    {
      field: 'tax_id',
      label: 'Tax ID/EIN',
      status: companyInfo.tax_id ? 'complete' : 'info',
      message: companyInfo.tax_id ? 'Tax ID is set' : 'Tax ID may be required for business operations',
      required: false,
    },
    {
      field: 'website',
      label: 'Website',
      status: companyInfo.website ? 'complete' : 'info',
      message: companyInfo.website ? 'Website URL is set' : 'Website helps establish online presence',
      required: false,
    },
    {
      field: 'description',
      label: 'Company Description',
      status: companyInfo.description ? 'complete' : 'info',
      message: companyInfo.description 
        ? `Description added (${companyInfo.description.length} characters)`
        : 'Description helps customers understand your business',
      required: false,
    },
  ];

  const requiredItems = validationItems.filter(item => item.required);
  const optionalItems = validationItems.filter(item => !item.required);
  
  const completedRequired = requiredItems.filter(item => item.status === 'complete').length;
  const totalRequired = requiredItems.length;
  
  const completedOptional = optionalItems.filter(item => item.status === 'complete').length;
  const totalOptional = optionalItems.length;

  const getStatusIcon = (status: ValidationItem['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'missing':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: ValidationItem['status']) => {
    switch (status) {
      case 'complete':
        return <Badge variant="default" className="bg-green-100 text-green-800">Complete</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Recommended</Badge>;
      case 'missing':
        return <Badge variant="destructive">Required</Badge>;
      case 'info':
        return <Badge variant="outline" className="bg-blue-50 text-blue-800">Optional</Badge>;
    }
  };

  const completionPercentage = Math.round(((completedRequired + completedOptional) / (totalRequired + totalOptional)) * 100);

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Company Profile Completeness
            </CardTitle>
            <CardDescription>
              Track the completeness of your company information
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{completionPercentage}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Required Fields */}
          <div>
            <h4 className="font-medium text-sm mb-3 text-slate-900">
              Required Information ({completedRequired}/{totalRequired})
            </h4>
            <div className="space-y-2">
              {requiredItems.map((item) => (
                <div key={item.field} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <span className="font-medium text-sm">{item.label}</span>
                      <p className="text-xs text-muted-foreground">{item.message}</p>
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              ))}
            </div>
          </div>

          {/* Optional Fields */}
          <div>
            <h4 className="font-medium text-sm mb-3 text-slate-900">
              Additional Information ({completedOptional}/{totalOptional})
            </h4>
            <div className="space-y-2">
              {optionalItems.map((item) => (
                <div key={item.field} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <span className="font-medium text-sm">{item.label}</span>
                      <p className="text-xs text-muted-foreground">{item.message}</p>
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pt-4 border-t">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span className="font-medium">{completedRequired + completedOptional} of {totalRequired + totalOptional} fields</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}