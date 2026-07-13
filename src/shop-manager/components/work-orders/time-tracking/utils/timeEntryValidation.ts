
interface TimeEntryValidationInput {
  employee: string;
  startDateTime: Date;
  endDateTime: Date;
  durationInMinutes: number;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateTimeEntry(data: TimeEntryValidationInput): ValidationResult {
  // Validate employee name
  if (!data.employee) {
    return {
      valid: false,
      message: "Employee name is required"
    };
  }
  
  // Validate duration
  if (data.durationInMinutes <= 0) {
    return {
      valid: false,
      message: "Duration must be greater than zero"
    };
  }
  
  // Validate start/end time logic
  if (data.endDateTime < data.startDateTime) {
    return {
      valid: false,
      message: "End time cannot be before start time"
    };
  }
  
  // All validations passed
  return { valid: true };
}
