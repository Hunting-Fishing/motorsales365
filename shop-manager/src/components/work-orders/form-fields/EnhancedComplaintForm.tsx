import React, { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { WorkOrderFormSchemaValues } from "@/schemas/workOrderSchema";

interface EnhancedComplaintFormProps {
  form: UseFormReturn<WorkOrderFormSchemaValues>;
}

interface ComplaintData {
  description: string;
  scenario?: string;
  urgency?: string;
  symptomCategory?: string;
  specificSymptoms?: string;
  suspectedCause?: string;
}

const scenarios = [
  "Starting Issues",
  "While Driving",
  "When Parking",
  "Idling Problems",
  "During Acceleration",
  "When Braking",
  "During Turning",
  "After Sitting",
  "In Cold Weather",
  "In Hot Weather",
  "Other"
];

const symptomCategories = [
  "Engine Performance",
  "Starting & Lights", 
  "Noises & Comforts",
  "Vibrations & Leaks",
  "Electrical Issues",
  "Brake Problems",
  "Steering Issues",
  "Transmission Problems"
];

const specificSymptoms = {
  "Engine Performance": ["Poor acceleration", "Rough idle", "Engine knock", "Loss of power", "Stalling", "Hesitation"],
  "Starting & Lights": ["Won't start", "Hard to start", "Dim lights", "No lights", "Intermittent starting", "Battery issues"],
  "Noises & Comforts": ["Grinding noise", "Squealing", "Rattling", "AC not working", "Heater issues", "Strange odors"],
  "Vibrations & Leaks": ["Vibration while driving", "Steering wheel shake", "Oil leak", "Coolant leak", "Fluid puddles", "Excessive vibration"],
  "Electrical Issues": ["Dashboard warning lights", "Dead battery", "Alternator problems", "Wiring issues", "Electronic malfunctions"],
  "Brake Problems": ["Squeaking brakes", "Grinding brakes", "Soft brake pedal", "Hard brake pedal", "Brake warning light"],
  "Steering Issues": ["Hard to steer", "Loose steering", "Steering wheel vibration", "Power steering noise", "Alignment issues"],
  "Transmission Problems": ["Slipping", "Hard shifting", "No reverse", "Delayed engagement", "Transmission noise"]
};

const urgencyLevels = [
  { value: "critical", label: "Critical", color: "destructive" },
  { value: "high", label: "High", color: "destructive" },
  { value: "medium", label: "Medium", color: "secondary" },
  { value: "low", label: "Low", color: "outline" }
];

const complaintTemplates = [
  "Vehicle won't start this morning",
  "Strange noise when braking",
  "Check engine light came on",
  "Car pulls to one side while driving", 
  "AC not cooling properly",
  "Engine overheating",
  "Transmission slipping"
];

export const EnhancedComplaintForm: React.FC<EnhancedComplaintFormProps> = ({ form }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSymptomCategory, setSelectedSymptomCategory] = useState<string>("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [complaintData, setComplaintData] = useState<ComplaintData>({
    description: "",
    scenario: "",
    urgency: "",
    symptomCategory: "",
    specificSymptoms: "",
    suspectedCause: ""
  });

  // Parse existing customerComplaint field on mount
  useEffect(() => {
    const currentComplaint = form.getValues("customerComplaint") || "";
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(currentComplaint);
      if (parsed && typeof parsed === 'object' && parsed.description !== undefined) {
        setComplaintData(parsed);
        setSelectedSymptomCategory(parsed.symptomCategory || "");
        if (parsed.scenario || parsed.urgency || parsed.symptomCategory) {
          setIsExpanded(true);
        }
      } else {
        // If not JSON, treat as simple description
        setComplaintData({ ...complaintData, description: currentComplaint });
      }
    } catch {
      // If parsing fails, treat as simple description
      setComplaintData({ ...complaintData, description: currentComplaint });
    }
  }, []);

  // Update form field whenever complaint data changes
  useEffect(() => {
    const hasStructuredData = complaintData.scenario || complaintData.urgency || 
                              complaintData.symptomCategory || complaintData.specificSymptoms || 
                              complaintData.suspectedCause;
    
    if (hasStructuredData || isExpanded) {
      // Store as JSON when we have structured data
      form.setValue("customerComplaint", JSON.stringify(complaintData));
    } else {
      // Store as plain text when only basic description
      form.setValue("customerComplaint", complaintData.description);
    }
  }, [complaintData, isExpanded, form]);

  const updateComplaintData = (field: keyof ComplaintData, value: string) => {
    setComplaintData(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateSelect = (template: string) => {
    updateComplaintData("description", template);
    setShowTemplates(false);
  };

  const getUrgencyColor = (level: string) => {
    const urgency = urgencyLevels.find(u => u.value === level);
    return urgency?.color || "outline";
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Customer Complaint</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2"
          >
            {isExpanded ? "Simple" : "Detailed"}
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main complaint field */}
        <FormItem>
          <FormLabel>Complaint Description</FormLabel>
          <FormControl>
            <div className="space-y-2">
              <textarea
                value={complaintData.description}
                onChange={(e) => updateComplaintData("description", e.target.value)}
                placeholder="Enter the customer's specific complaint or issue..."
                className="w-full p-3 border border-input rounded-md min-h-[80px] resize-vertical"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"  
                  size="sm"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Quick Templates
                </Button>
              </div>
              {showTemplates && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-muted rounded-md">
                  {complaintTemplates.map((template, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTemplateSelect(template)}
                      className="justify-start text-xs h-auto py-2 px-3 whitespace-normal text-left"
                    >
                      {template}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </FormControl>
        </FormItem>

        {/* Expanded detailed fields */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scenario */}
              <FormItem>
                <FormLabel>When does it occur?</FormLabel>
                <Select 
                  onValueChange={(value) => updateComplaintData("scenario", value)} 
                  value={complaintData.scenario}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scenario" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {scenarios.map((scenario) => (
                      <SelectItem key={scenario} value={scenario}>
                        {scenario}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>

              {/* Urgency Level */}
              <FormItem>
                <FormLabel>Urgency Level</FormLabel>
                <Select 
                  onValueChange={(value) => updateComplaintData("urgency", value)} 
                  value={complaintData.urgency}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {urgencyLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex items-center gap-2">
                          <Badge variant={level.color as any} className="text-xs">
                            {level.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Symptom Category */}
              <FormItem>
                <FormLabel>Symptom Category</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    updateComplaintData("symptomCategory", value);
                    setSelectedSymptomCategory(value);
                    updateComplaintData("specificSymptoms", ""); // Reset specific symptoms
                  }} 
                  value={complaintData.symptomCategory}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {symptomCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>

              {/* Specific Symptoms */}
              <FormItem>
                <FormLabel>Specific Symptoms</FormLabel>
                <Select 
                  onValueChange={(value) => updateComplaintData("specificSymptoms", value)} 
                  value={complaintData.specificSymptoms}
                  disabled={!selectedSymptomCategory}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        selectedSymptomCategory 
                          ? "Select specific symptom" 
                          : "Select category first"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {selectedSymptomCategory && specificSymptoms[selectedSymptomCategory as keyof typeof specificSymptoms]?.map((symptom) => (
                      <SelectItem key={symptom} value={symptom}>
                        {symptom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            </div>

            {/* Suspected Cause */}
            <FormItem>
              <FormLabel>Suspected Cause (Optional)</FormLabel>
              <FormControl>
                <textarea
                  value={complaintData.suspectedCause}
                  onChange={(e) => updateComplaintData("suspectedCause", e.target.value)}
                  placeholder="Any initial thoughts on what might be causing the issue..."
                  className="w-full p-3 border border-input rounded-md min-h-[60px] resize-vertical"
                  rows={2}
                />
              </FormControl>
            </FormItem>
          </div>
        )}
      </CardContent>
    </Card>
  );
};