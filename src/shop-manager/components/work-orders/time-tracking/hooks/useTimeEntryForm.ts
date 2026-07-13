
import { useState, useEffect } from "react";
import { TimeEntry } from "@/types/workOrder";
import { differenceInMinutes, parse } from "date-fns";

interface UseTimeEntryFormProps {
  workOrderId: string;
  timeEntry: TimeEntry | null;
  onSave: (timeEntry: TimeEntry) => void;
  onCancel: () => void;
}

export const useTimeEntryForm = ({
  workOrderId,
  timeEntry,
  onSave,
  onCancel
}: UseTimeEntryFormProps) => {
  // Form state
  const [employee, setEmployee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState(0);
  const [notes, setNotes] = useState("");
  const [billable, setBillable] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditing = !!timeEntry;

  // Initialize form with existing time entry data if provided
  useEffect(() => {
    if (timeEntry) {
      setEmployee(timeEntry.employee_name);
      
      if (timeEntry.start_time) {
        const startDateTime = new Date(timeEntry.start_time);
        setStartDate(startDateTime.toISOString().split('T')[0]);
        setStartTime(startDateTime.toTimeString().slice(0, 5));
      }
      
      if (timeEntry.end_time) {
        const endDateTime = new Date(timeEntry.end_time);
        setEndDate(endDateTime.toISOString().split('T')[0]);
        setEndTime(endDateTime.toTimeString().slice(0, 5));
      }
      
      setDuration(timeEntry.duration);
      setNotes(timeEntry.notes || "");
      setBillable(timeEntry.billable);
    }
  }, [timeEntry]);

  // Calculate duration based on start and end times
  const calculateDuration = () => {
    if (startDate && startTime && endDate && endTime) {
      try {
        const startDateTime = parse(
          `${startDate} ${startTime}`,
          'yyyy-MM-dd HH:mm',
          new Date()
        );
        const endDateTime = parse(
          `${endDate} ${endTime}`,
          'yyyy-MM-dd HH:mm',
          new Date()
        );
        
        if (endDateTime > startDateTime) {
          const durationInMinutes = differenceInMinutes(endDateTime, startDateTime);
          setDuration(durationInMinutes);
          setErrors(prev => ({ ...prev, duration: "" }));
        } else {
          setErrors(prev => ({ ...prev, endTime: "End time must be after start time" }));
        }
      } catch (error) {
        console.error("Error calculating duration:", error);
      }
    }
  };

  // Validate form fields
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!employee) {
      newErrors.employee = "Employee name is required";
    }
    
    if (!startDate) {
      newErrors.startDate = "Start date is required";
    }
    
    if (!startTime) {
      newErrors.startTime = "Start time is required";
    }
    
    if (duration <= 0) {
      newErrors.duration = "Duration must be greater than 0";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Create the time entry object
    const timeEntryData: TimeEntry = {
      id: timeEntry?.id || crypto.randomUUID(),
      work_order_id: workOrderId,
      employee_id: timeEntry?.employee_id || crypto.randomUUID().substring(0, 8),
      employee_name: employee,
      start_time: `${startDate}T${startTime}:00`,
      end_time: endTime ? `${endDate}T${endTime}:00` : undefined,
      duration,
      billable,
      notes: notes || undefined,
      created_at: timeEntry?.created_at || new Date().toISOString(),
    };
    
    onSave(timeEntryData);
  };

  return {
    employee,
    setEmployee,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    duration,
    setDuration,
    notes,
    setNotes,
    billable,
    setBillable,
    errors,
    isEditing,
    calculateDuration,
    handleSubmit,
    onCancel
  };
};
