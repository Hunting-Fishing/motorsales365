
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LightbulbIcon, ClipboardCopy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TipType {
  title: string;
  content: string;
}

interface TechTipsProps {
  onInsert: (tip: string) => void;
}

export const TechTips: React.FC<TechTipsProps> = ({ onInsert }) => {
  const [activeTipCategory, setActiveTipCategory] = useState<string>("diagnostic");

  const tipCategories = [
    { id: "diagnostic", label: "Diagnostic" },
    { id: "inspection", label: "Inspection" },
    { id: "maintenance", label: "Maintenance" },
    { id: "repair", label: "Repair" }
  ];

  const tips: Record<string, TipType[]> = {
    diagnostic: [
      { 
        title: "Engine Diagnostic", 
        content: "Complete engine diagnostic performed. Scanned for codes and performed visual inspection of engine components." 
      },
      { 
        title: "Electrical System Check", 
        content: "Performed electrical system diagnostic. Tested battery, alternator, and starter. Checked for parasitic draw." 
      }
    ],
    inspection: [
      { 
        title: "Vehicle Inspection", 
        content: "Performed comprehensive multi-point inspection including: brakes, suspension, steering, fluids, belts, hoses, and lights." 
      },
      { 
        title: "Pre-purchase Inspection", 
        content: "Conducted pre-purchase inspection. Checked mechanical systems, body condition, and performed road test to verify drivability." 
      }
    ],
    maintenance: [
      { 
        title: "Oil Change", 
        content: "Changed oil and filter. Used [oil type] oil and [filter brand] filter. Reset oil life monitor." 
      },
      { 
        title: "Brake Service", 
        content: "Performed brake service including pad replacement, rotor machining, caliper lubrication, and brake fluid check." 
      }
    ],
    repair: [
      { 
        title: "Suspension Repair", 
        content: "Replaced worn suspension components including [parts]. Performed alignment after repair to manufacturer specifications." 
      },
      { 
        title: "Engine Repair", 
        content: "Diagnosed and repaired engine issue. Replaced [parts]. Performed testing after repair to verify proper operation." 
      }
    ]
  };

  const handleInsert = (tipContent: string) => {
    onInsert(tipContent);
    toast({
      title: "Text inserted",
      description: "The tip has been added to your description",
    });
  };

  return (
    <Card className="mt-2">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <LightbulbIcon className="h-5 w-5 text-yellow-500" />
          <h3 className="text-sm font-medium">Tech Tips</h3>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {tipCategories.map((category) => (
            <Button
              key={category.id}
              variant={activeTipCategory === category.id ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setActiveTipCategory(category.id)}
            >
              {category.label}
            </Button>
          ))}
        </div>

        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
          {tips[activeTipCategory]?.map((tip, index) => (
            <div key={index} className="bg-muted p-2 rounded-md">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-medium">{tip.title}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleInsert(tip.content)}
                >
                  <ClipboardCopy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{tip.content}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
