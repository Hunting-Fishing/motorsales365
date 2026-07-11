
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { EmailABTest, EmailABTestVariant } from "@/types/email";
import { 
  AlertTriangle, 
  Plus, 
  Trash2,
  Copy,
  BarChart2, 
  Mail, 
  Sparkles 
} from "lucide-react";

interface EmailABTestingFormProps {
  abTest: EmailABTest | null;
  onChange: (abTest: EmailABTest) => void;
  defaultSubject: string;
  defaultContent: string;
}

export function EmailABTestingForm({
  abTest,
  onChange,
  defaultSubject,
  defaultContent
}: EmailABTestingFormProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Initialize with either existing AB test or a new one
  const initialAbTest: EmailABTest = abTest || {
    enabled: false,
    variants: [
      {
        id: `variant-${Date.now()}-1`,
        name: "Variant A",
        subject: defaultSubject,
        content: defaultContent,
        recipientPercentage: 50,
        recipients: 0,
        opened: 0,
        clicked: 0,
      },
      {
        id: `variant-${Date.now()}-2`,
        name: "Variant B",
        subject: defaultSubject,
        content: defaultContent,
        recipientPercentage: 50,
        recipients: 0,
        opened: 0,
        clicked: 0,
      }
    ],
    winnerCriteria: 'open_rate',
    winnerSelectionDate: null,
    winnerId: null,
  };

  const [testConfig, setTestConfig] = useState<EmailABTest>(initialAbTest);

  const handleToggleEnabled = () => {
    const updatedConfig = {
      ...testConfig,
      enabled: !testConfig.enabled
    };
    setTestConfig(updatedConfig);
    onChange(updatedConfig);
  };

  const handleChangeCriteria = (value: 'open_rate' | 'click_rate') => {
    const updatedConfig = {
      ...testConfig,
      winnerCriteria: value
    };
    setTestConfig(updatedConfig);
    onChange(updatedConfig);
  };

  const handleUpdateVariant = (index: number, field: keyof EmailABTestVariant, value: any) => {
    const updatedVariants = [...testConfig.variants];
    updatedVariants[index] = {
      ...updatedVariants[index],
      [field]: value
    };
    
    // If updating percentage, adjust other variants to total 100%
    if (field === 'recipientPercentage') {
      const totalOthers = updatedVariants.reduce((sum, variant, i) => 
        i !== index ? sum + variant.recipientPercentage : sum, 0);
      
      const remaining = 100 - value;
      
      if (updatedVariants.length > 1 && remaining > 0) {
        // Distribute remaining percentage to other variants proportionally
        const oldTotalOthers = totalOthers || 1; // Avoid division by zero
        
        updatedVariants.forEach((variant, i) => {
          if (i !== index) {
            const newPercentage = (variant.recipientPercentage / oldTotalOthers) * remaining;
            updatedVariants[i] = {
              ...variant,
              recipientPercentage: Math.round(newPercentage)
            };
          }
        });
        
        // Ensure we total exactly 100% by adjusting the last variant
        const lastNonCurrentIndex = index === updatedVariants.length - 1 
          ? updatedVariants.length - 2 
          : updatedVariants.length - 1;
        
        const calculatedTotal = updatedVariants.reduce((sum, variant) => 
          sum + variant.recipientPercentage, 0);
        
        if (calculatedTotal !== 100) {
          const adjustment = 100 - calculatedTotal;
          updatedVariants[lastNonCurrentIndex] = {
            ...updatedVariants[lastNonCurrentIndex],
            recipientPercentage: updatedVariants[lastNonCurrentIndex].recipientPercentage + adjustment
          };
        }
      }
    }
    
    const updatedConfig = {
      ...testConfig,
      variants: updatedVariants
    };
    
    setTestConfig(updatedConfig);
    onChange(updatedConfig);
  };

  const addVariant = () => {
    if (testConfig.variants.length >= 5) {
      return; // Maximum 5 variants
    }
    
    const newVariant: EmailABTestVariant = {
      id: `variant-${Date.now()}-${testConfig.variants.length + 1}`,
      name: `Variant ${String.fromCharCode(65 + testConfig.variants.length)}`, // A, B, C, etc.
      subject: defaultSubject,
      content: defaultContent,
      recipientPercentage: 0, // Will be adjusted in the next step
      recipients: 0,
      opened: 0,
      clicked: 0,
    };
    
    const updatedVariants = [...testConfig.variants, newVariant];
    
    // Adjust percentages to be equal
    const equalPercentage = Math.floor(100 / updatedVariants.length);
    const remainder = 100 - (equalPercentage * updatedVariants.length);
    
    updatedVariants.forEach((variant, index) => {
      variant.recipientPercentage = equalPercentage;
      // Add remainder to the first variant
      if (index === 0) {
        variant.recipientPercentage += remainder;
      }
    });
    
    const updatedConfig = {
      ...testConfig,
      variants: updatedVariants
    };
    
    setTestConfig(updatedConfig);
    onChange(updatedConfig);
  };

  const removeVariant = (index: number) => {
    if (testConfig.variants.length <= 2) {
      return; // Minimum 2 variants
    }
    
    const updatedVariants = testConfig.variants.filter((_, i) => i !== index);
    
    // Redistribute percentages
    const equalPercentage = Math.floor(100 / updatedVariants.length);
    const remainder = 100 - (equalPercentage * updatedVariants.length);
    
    updatedVariants.forEach((variant, i) => {
      variant.recipientPercentage = equalPercentage;
      if (i === 0) {
        variant.recipientPercentage += remainder;
      }
    });
    
    const updatedConfig = {
      ...testConfig,
      variants: updatedVariants
    };
    
    setTestConfig(updatedConfig);
    onChange(updatedConfig);
  };

  const duplicateVariant = (index: number) => {
    if (testConfig.variants.length >= 5) {
      return; // Maximum 5 variants
    }
    
    const variantToDuplicate = testConfig.variants[index];
    const newVariant: EmailABTestVariant = {
      ...variantToDuplicate,
      id: `variant-${Date.now()}-${testConfig.variants.length + 1}`,
      name: `${variantToDuplicate.name} (Copy)`,
      recipientPercentage: 0, // Will be adjusted
    };
    
    const updatedVariants = [...testConfig.variants, newVariant];
    
    // Adjust percentages
    const equalPercentage = Math.floor(100 / updatedVariants.length);
    const remainder = 100 - (equalPercentage * updatedVariants.length);
    
    updatedVariants.forEach((variant, i) => {
      variant.recipientPercentage = equalPercentage;
      if (i === 0) {
        variant.recipientPercentage += remainder;
      }
    });
    
    const updatedConfig = {
      ...testConfig,
      variants: updatedVariants
    };
    
    setTestConfig(updatedConfig);
    onChange(updatedConfig);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="enable-ab-testing"
          checked={testConfig.enabled}
          onChange={handleToggleEnabled}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="enable-ab-testing" className="text-base font-medium">
          Enable A/B Testing
        </Label>
      </div>
      
      {testConfig.enabled && (
        <>
          <div className="bg-yellow-50 border-yellow-200 border rounded-md p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">A/B Testing will split your audience</p>
              <p>Recipients will be randomly assigned to one of your variants. You can control the percentage of recipients who receive each variant.</p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="overview">
                <BarChart2 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="variants">
                <Mail className="h-4 w-4 mr-2" />
                Variants ({testConfig.variants.length})
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Sparkles className="h-4 w-4 mr-2" />
                Test Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>A/B Testing Summary</CardTitle>
                  <CardDescription>
                    Overview of your A/B test configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Variants</h4>
                    <div className="space-y-3">
                      {testConfig.variants.map((variant, index) => (
                        <div key={variant.id} className="grid grid-cols-5 gap-4 items-center">
                          <div className="font-medium col-span-2">
                            {variant.name}
                          </div>
                          <div className="col-span-2">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary"
                                style={{ width: `${variant.recipientPercentage}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            {variant.recipientPercentage}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Winner Selection</h4>
                    <p className="text-sm text-muted-foreground">
                      The winner will be determined based on {' '}
                      <span className="font-medium">
                        {testConfig.winnerCriteria === 'open_rate' ? 'Open Rate' : 'Click Rate'}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="variants" className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Email Variants</h3>
                <Button 
                  onClick={addVariant} 
                  variant="outline"
                  disabled={testConfig.variants.length >= 5}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>
              
              <div className="space-y-6">
                {testConfig.variants.map((variant, index) => (
                  <Card key={variant.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">
                          {variant.name}
                          <span className="ml-2 text-xs text-muted-foreground font-normal">
                            ({variant.recipientPercentage}% of recipients)
                          </span>
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => duplicateVariant(index)}
                            disabled={testConfig.variants.length >= 5}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => removeVariant(index)}
                            disabled={testConfig.variants.length <= 2}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`variant-${index}-name`}>Variant Name</Label>
                        <Input
                          id={`variant-${index}-name`}
                          value={variant.name}
                          onChange={(e) => handleUpdateVariant(index, 'name', e.target.value)}
                          placeholder="Name for this variant"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`variant-${index}-subject`}>Subject Line</Label>
                        <Input
                          id={`variant-${index}-subject`}
                          value={variant.subject}
                          onChange={(e) => handleUpdateVariant(index, 'subject', e.target.value)}
                          placeholder="Email subject line"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`variant-${index}-content`}>Email Content</Label>
                        <Textarea
                          id={`variant-${index}-content`}
                          value={variant.content}
                          onChange={(e) => handleUpdateVariant(index, 'content', e.target.value)}
                          placeholder="Email content"
                          rows={5}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label htmlFor={`variant-${index}-percentage`}>Percentage of Recipients</Label>
                          <span className="text-sm font-medium">{variant.recipientPercentage}%</span>
                        </div>
                        <Slider
                          id={`variant-${index}-percentage`}
                          value={[variant.recipientPercentage]}
                          min={5}
                          max={95}
                          step={5}
                          onValueChange={(value) => handleUpdateVariant(index, 'recipientPercentage', value[0])}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Test Configuration</CardTitle>
                  <CardDescription>
                    Configure how the winning variant is determined
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="winner-criteria">Winner Selection Criteria</Label>
                    <RadioGroup 
                      value={testConfig.winnerCriteria}
                      onValueChange={(value) => handleChangeCriteria(value as 'open_rate' | 'click_rate')}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="open_rate" id="open_rate" />
                        <Label htmlFor="open_rate" className="font-normal">
                          Best Open Rate
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="click_rate" id="click_rate" />
                        <Label htmlFor="click_rate" className="font-normal">
                          Best Click Rate
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
