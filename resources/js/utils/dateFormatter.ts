/**
 * Centralized date formatting utilities for consistent date handling across the application
 */

// Standard date formats used across the application
export const DATE_FORMATS = {
  ISO_DATE: 'YYYY-MM-DD', // For API and database: 2026-01-05
  DISPLAY_DATE: 'MMM DD, YYYY', // For display: Jan 05, 2026
  DISPLAY_DATE_FULL: 'MMMM DD, YYYY', // For display: January 05, 2026
  DISPLAY_DATETIME: 'MMM DD, YYYY h:mm A', // For display: Jan 05, 2026 2:30 PM
  TIME_12H: 'h:mm A', // For display: 2:30 PM
  TIME_24H: 'HH:mm', // For API: 14:30
} as const;

/**
 * Format date to ISO string (YYYY-MM-DD) for API/database
 */
export const toISODate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

/**
 * Format date for display (MMM DD, YYYY)
 * Example: Jan 05, 2026
 */
export const formatDisplayDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format date with full month name (MMMM DD, YYYY)
 * Example: January 05, 2026
 */
export const formatDisplayDateFull = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date and time for display (MMM DD, YYYY h:mm A)
 * Example: Jan 05, 2026 2:30 PM
 */
export const formatDisplayDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format time in 12-hour format (h:mm A)
 * Example: 2:30 PM
 */
export const formatTime12Hour = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format time in 24-hour format (HH:mm)
 * Example: 14:30
 */
export const formatTime24Hour = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Format date for Philippine locale (en-PH)
 * Example: Jan 05, 2026
 */
export const formatDatePH = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format currency in Philippine Peso
 * Example: ₱1,234.56
 */
export const formatCurrencyPHP = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 */
export const getRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  const isPast = diffMs < 0;
  const prefix = isPast ? '' : 'in ';
  const suffix = isPast ? ' ago' : '';
  
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${prefix}${diffMin} minute${diffMin > 1 ? 's' : ''}${suffix}`;
  if (diffHours < 24) return `${prefix}${diffHours} hour${diffHours > 1 ? 's' : ''}${suffix}`;
  if (diffDays < 7) return `${prefix}${diffDays} day${diffDays > 1 ? 's' : ''}${suffix}`;
  
  return formatDisplayDate(d);
};

/**
 * Get current date in ISO format (for default form values)
 */
export const getCurrentISODate = (): string => {
  return toISODate(new Date());
};

/**
 * Get first day of current month in ISO format
 */
export const getFirstDayOfMonthISO = (): string => {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
};

/**
 * Get last day of current month in ISO format
 */
export const getLastDayOfMonthISO = (): string => {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
};
