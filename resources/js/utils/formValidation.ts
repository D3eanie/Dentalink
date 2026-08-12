/**
 * Frontend form validation utilities
 * Provides client-side validation to complement backend validation
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Validate a single field against rules
 */
export const validateField = (
  value: any,
  rules: ValidationRule
): string | null => {
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return rules.message || 'This field is required';
  }

  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return rules.message || `Minimum length is ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return rules.message || `Maximum length is ${rules.maxLength} characters`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message || 'Invalid format';
    }
  }

  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return rules.message || `Minimum value is ${rules.min}`;
    }

    if (rules.max !== undefined && value > rules.max) {
      return rules.message || `Maximum value is ${rules.max}`;
    }
  }

  if (rules.custom && !rules.custom(value)) {
    return rules.message || 'Invalid value';
  }

  return null;
};

/**
 * Validate multiple fields against rules
 */
export const validateForm = (
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach((key) => {
    const error = validateField(data[key], rules[key]);
    if (error) {
      errors[key] = error;
    }
  });

  return errors;
};

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphabetic: /^[a-zA-Z\s]+$/,
  numeric: /^[0-9]+$/,
  decimal: /^\d+(\.\d{1,2})?$/,
  time24: /^([01]\d|2[0-3]):([0-5]\d)$/,
  time12: /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM|am|pm)$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
} as const;

/**
 * Common validation rules
 */
export const VALIDATION_RULES = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || 'This field is required',
  }),

  email: (message?: string): ValidationRule => ({
    required: true,
    pattern: VALIDATION_PATTERNS.email,
    message: message || 'Please enter a valid email address',
  }),

  phone: (message?: string): ValidationRule => ({
    pattern: VALIDATION_PATTERNS.phone,
    message: message || 'Please enter a valid phone number',
  }),

  password: (message?: string): ValidationRule => ({
    required: true,
    minLength: 8,
    pattern: VALIDATION_PATTERNS.password,
    message: message || 'Password must be at least 8 characters with uppercase, lowercase, and number',
  }),

  positiveNumber: (message?: string): ValidationRule => ({
    required: true,
    min: 0,
    message: message || 'Please enter a positive number',
  }),

  positiveDecimal: (message?: string): ValidationRule => ({
    required: true,
    pattern: VALIDATION_PATTERNS.decimal,
    custom: (value) => parseFloat(value) > 0,
    message: message || 'Please enter a valid positive amount',
  }),

  time24: (message?: string): ValidationRule => ({
    required: true,
    pattern: VALIDATION_PATTERNS.time24,
    message: message || 'Please enter time in HH:MM format (e.g., 14:30)',
  }),

  futureDate: (message?: string): ValidationRule => ({
    required: true,
    custom: (value) => {
      if (!value) return false;
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    },
    message: message || 'Please select a future date',
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    minLength: length,
    message: message || `Minimum length is ${length} characters`,
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    maxLength: length,
    message: message || `Maximum length is ${length} characters`,
  }),

  range: (min: number, max: number, message?: string): ValidationRule => ({
    min,
    max,
    message: message || `Value must be between ${min} and ${max}`,
  }),
} as const;

/**
 * Appointment-specific validation rules
 */
export const APPOINTMENT_VALIDATION = {
  patientId: VALIDATION_RULES.required('Please select a patient'),
  doctorId: VALIDATION_RULES.required('Please select a doctor'),
  serviceId: VALIDATION_RULES.required('Please select a service'),
  appointmentDate: VALIDATION_RULES.futureDate('Please select a future date'),
  appointmentTime: VALIDATION_RULES.time24('Please enter a valid time'),
  duration: {
    required: true,
    min: 15,
    max: 480,
    message: 'Duration must be between 15 and 480 minutes',
  },
};

/**
 * Service-specific validation rules
 */
export const SERVICE_VALIDATION = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
    message: 'Service name must be between 3 and 100 characters',
  },
  description: {
    maxLength: 500,
    message: 'Description must not exceed 500 characters',
  },
  price: VALIDATION_RULES.positiveDecimal('Please enter a valid price'),
  duration: {
    required: true,
    min: 15,
    max: 480,
    message: 'Duration must be between 15 and 480 minutes',
  },
  category: VALIDATION_RULES.required('Please select a category'),
};

/**
 * User-specific validation rules
 */
export const USER_VALIDATION = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: VALIDATION_PATTERNS.alphabetic,
    message: 'Name must be between 2 and 100 characters (letters only)',
  },
  email: VALIDATION_RULES.email(),
  password: VALIDATION_RULES.password(),
  phone: {
    ...VALIDATION_RULES.phone(),
    minLength: 10,
    maxLength: 15,
  },
  role: VALIDATION_RULES.required('Please select a role'),
};

/**
 * Financial record validation rules
 */
export const FINANCIAL_VALIDATION = {
  amount: VALIDATION_RULES.positiveDecimal('Please enter a valid amount'),
  paymentMethod: VALIDATION_RULES.required('Please select a payment method'),
  transactionDate: VALIDATION_RULES.required('Please select a transaction date'),
};
