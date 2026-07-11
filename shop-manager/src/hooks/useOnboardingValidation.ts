
import { useState } from 'react';
import { ErrorHandler } from '@/utils/errorHandler';
import { OnboardingError, ErrorType, ErrorSeverity, ERROR_CODES } from '@/utils/errorTypes';

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function useOnboardingValidation() {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateBasicInfo = (data: any): ValidationResult => {
    const errors: Record<string, string> = {};

    if (!data.name?.trim()) {
      errors.name = 'Shop name is required';
    }

    if (!data.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!data.phone?.trim()) {
      errors.phone = 'Phone number is required';
    }

    if (!data.address?.trim()) {
      errors.address = 'Address is required';
    }

    if (!data.city?.trim()) {
      errors.city = 'City is required';
    }

    if (!data.state?.trim()) {
      errors.state = 'State is required';
    }

    if (!data.zip?.trim()) {
      errors.zip = 'ZIP code is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  const validateBusinessDetails = (data: any): ValidationResult => {
    const errors: Record<string, string> = {};

    if (!data.businessType?.trim()) {
      errors.businessType = 'Business type is required';
    }

    if (!data.industry?.trim()) {
      errors.industry = 'Industry is required';
    }

    if (data.industry === 'other' && !data.otherIndustry?.trim()) {
      errors.otherIndustry = 'Please specify your industry';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  const validateStep = (stepIndex: number, data: any): ValidationResult => {
    let result: ValidationResult;

    switch (stepIndex) {
      case 0:
        result = validateBasicInfo(data);
        break;
      case 1:
        result = validateBusinessDetails(data);
        break;
      case 2:
        // Business hours validation (optional for now)
        result = { isValid: true, errors: {} };
        break;
      default:
        result = { isValid: true, errors: {} };
    }

    setValidationErrors(result.errors);

    if (!result.isValid) {
      const error = new OnboardingError(
        ErrorType.VALIDATION,
        ErrorSeverity.WARNING,
        ERROR_CODES.STEP_VALIDATION_FAILED,
        'Validation failed',
        'Please complete all required fields before continuing',
        result.errors
      );
      ErrorHandler.showUserError(error);
    }

    return result;
  };

  const clearValidationErrors = () => {
    setValidationErrors({});
  };

  return {
    validationErrors,
    validateStep,
    clearValidationErrors
  };
}
