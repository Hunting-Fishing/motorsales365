
import { useState, useEffect } from "react";
import { SavedReport } from "@/types/reports";
import { toast } from "@/components/ui/use-toast";
import { z } from "zod";

interface UseReportFormProps {
  currentReport: {
    title: string;
    type: string;
    filters: Record<string, any>;
  };
  onSaveReport: (report: SavedReport) => void;
}

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const reportSchema = z.object({
  reportName: z.string().min(1, "Report name is required").max(100, "Report name cannot exceed 100 characters"),
  reportDescription: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  scheduleEmail: z.string().refine(val => !val || emailRegex.test(val), "Please enter a valid email address").optional(),
});

export function useReportForm({ currentReport, onSaveReport }: UseReportFormProps) {
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [scheduleReport, setScheduleReport] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState("weekly");
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Reset form errors when fields change
  useEffect(() => {
    if (isDirty) {
      validateForm();
    }
  }, [reportName, reportDescription, scheduleEmail, scheduleReport, isDirty]);

  const validateForm = () => {
    const result = reportSchema.safeParse({
      reportName,
      reportDescription,
      scheduleEmail: scheduleReport ? scheduleEmail : undefined,
    });

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        formattedErrors[err.path[0].toString()] = err.message;
      });
      setFormErrors(formattedErrors);
      return false;
    }

    // Additional validation for scheduled reports
    if (scheduleReport && !scheduleEmail) {
      setFormErrors(prev => ({ ...prev, scheduleEmail: "Email is required for scheduled reports" }));
      return false;
    }

    setFormErrors({});
    return true;
  };

  const handleSaveReport = () => {
    setIsDirty(true);
    
    if (!validateForm()) {
      const firstError = Object.values(formErrors)[0];
      if (firstError) {
        toast({
          title: "Validation Error",
          description: firstError,
          variant: "destructive"
        });
      }
      return false;
    }

    const newReport: SavedReport = {
      id: `report-${Date.now()}`,
      name: reportName,
      description: reportDescription,
      type: currentReport.type,
      filters: currentReport.filters,
      createdAt: new Date().toISOString(),
      scheduled: scheduleReport ? {
        frequency: scheduleFrequency,
        email: scheduleEmail,
      } : undefined
    };

    onSaveReport(newReport);
    resetForm();
    
    toast({
      title: "Report saved",
      description: scheduleReport 
        ? `Report "${reportName}" saved and scheduled for ${scheduleFrequency} delivery` 
        : `Report "${reportName}" saved successfully`
    });
    
    return true;
  };

  const resetForm = () => {
    setReportName("");
    setReportDescription("");
    setScheduleReport(false);
    setScheduleFrequency("weekly");
    setScheduleEmail("");
    setFormErrors({});
    setIsDirty(false);
  };

  return {
    formState: {
      reportName,
      reportDescription,
      scheduleReport,
      scheduleFrequency,
      scheduleEmail,
      formErrors,
      isDirty
    },
    formActions: {
      setReportName,
      setReportDescription,
      setScheduleReport,
      setScheduleFrequency,
      setScheduleEmail,
      handleSaveReport,
      resetForm,
      validateForm
    }
  };
}
