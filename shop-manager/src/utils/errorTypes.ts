
export enum ErrorType {
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: Date;
  context?: Record<string, any>;
}

export class OnboardingError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly details?: any;
  public readonly context?: Record<string, any>;

  constructor(
    type: ErrorType,
    severity: ErrorSeverity,
    code: string,
    message: string,
    userMessage: string,
    details?: any,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'OnboardingError';
    this.type = type;
    this.severity = severity;
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
    this.context = context;
  }
}

// Predefined error codes and messages
export const ERROR_CODES = {
  DUPLICATE_ONBOARDING: 'DUPLICATE_ONBOARDING',
  INVALID_SHOP_DATA: 'INVALID_SHOP_DATA',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  DATABASE_CONSTRAINT: 'DATABASE_CONSTRAINT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  STEP_VALIDATION_FAILED: 'STEP_VALIDATION_FAILED'
} as const;

export const USER_FRIENDLY_MESSAGES = {
  [ERROR_CODES.DUPLICATE_ONBOARDING]: 'Your shop setup is already in progress. We\'ll continue from where you left off.',
  [ERROR_CODES.INVALID_SHOP_DATA]: 'Some information is missing or invalid. Please check your entries and try again.',
  [ERROR_CODES.NETWORK_TIMEOUT]: 'Connection timeout. Please check your internet connection and try again.',
  [ERROR_CODES.DATABASE_CONSTRAINT]: 'There was an issue saving your information. Please try again.',
  [ERROR_CODES.VALIDATION_FAILED]: 'Please fill in all required fields correctly.',
  [ERROR_CODES.UNAUTHORIZED]: 'You need to be logged in to complete the setup.',
  [ERROR_CODES.STEP_VALIDATION_FAILED]: 'Please complete all required fields in this step before continuing.'
} as const;
