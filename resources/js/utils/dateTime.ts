export const normalizeDateInput = (date: string): string => {
  return date.split('T')[0];
};

export const normalizeTimeInput = (time: string): string => {
  if (!time) return '';
  return time.length > 5 ? time.slice(0, 5) : time;
};

export const formatAppointmentTime = (time?: string, locale = 'en-PH'): string => {
  if (!time) return 'N/A';

  const cleanTime = normalizeTimeInput(time);
  const parts = cleanTime.split(':');
  const hours = Number(parts[0] ?? 0);
  const minutes = Number(parts[1] ?? 0);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return cleanTime;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatAppointmentDate = (
  date?: string,
  locale = 'en-PH',
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string => {
  if (!date) return 'N/A';

  const cleanDate = normalizeDateInput(date);
  // Parse as local date to avoid timezone conversion issues
  const [year, month, day] = cleanDate.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  if (Number.isNaN(dateObj.getTime())) {
    return cleanDate;
  }

  return dateObj.toLocaleDateString(locale, options);
};

export const formatAppointmentDateTime = (
  date?: string,
  time?: string,
  locale = 'en-PH',
  options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string => {
  if (!date || !time) return 'Invalid date/time';

  const cleanDate = normalizeDateInput(date);
  const cleanTime = normalizeTimeInput(time);

  // Parse as local date to avoid timezone conversion issues
  const [year, month, day] = cleanDate.split('-').map(Number);
  const [hours, minutes] = cleanTime.split(':').map(Number);
  const dateTime = new Date(year, month - 1, day, hours, minutes);

  if (Number.isNaN(dateTime.getTime())) {
    return `${cleanDate} ${cleanTime}`;
  }

  return dateTime.toLocaleString(locale, options);
};
