/**
 * Core type definitions for the dental clinic application
 * Replaces 'any' types with properly defined interfaces
 */

// Common types
export type UserRole = 'admin' | 'staff' | 'patient';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'pending' | 'paid' | 'partially_paid' | 'refunded';
export type PaymentMethod = 'cash' | 'credit_card' | 'gcash' | 'maya' | 'bank_transfer';
export type ServiceCategory = 'preventive' | 'restorative' | 'cosmetic' | 'surgical' | 'emergency';

// User related types
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient extends User {
  role: 'patient';
  medical_history?: string;
  allergies?: string;
  emergency_contact?: string;
}

export interface StaffMember extends User {
  role: 'staff';
  position?: string;
  specialization?: string;
  license_number?: string;
}

// Service types
export interface Service {
  id: number;
  name: string;
  description?: string;
  price: string | number;
  duration_minutes: number;
  category: ServiceCategory;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Appointment types
export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  service_id: number;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  payment_method?: PaymentMethod;
  balance?: string | number;
  notes?: string;
  checked_in_at?: string;
  created_at: string;
  updated_at: string;
  // Relationships
  patient?: Patient;
  doctor?: StaffMember;
  service?: Service;
  financial_records?: FinancialRecord[];
  financial_record?: FinancialRecord;
}

// Schedule types
export interface Schedule {
  id: number;
  staff_id: number;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relationships
  staff?: StaffMember;
}

// Financial Record types
export interface FinancialRecord {
  id: number;
  appointment_id?: number;
  patient_id: number;
  amount: string | number;
  balance?: string | number;
  is_partial_payment?: boolean;
  parent_record_id?: number;
  total_service_amount?: string | number;
  payment_method: PaymentMethod;
  transaction_date: string;
  description?: string;
  notes?: string;
  receipt_number?: string;
  blockchain_hash?: string;
  previous_hash?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Relationships
  appointment?: Appointment;
  patient?: Patient;
  parent_record?: FinancialRecord;
  follow_up_payments?: FinancialRecord[];
}

// Treatment Plan types
export interface TreatmentPlan {
  id: number;
  patient_id: number;
  diagnosis: string;
  treatment_plan: string;
  estimated_cost?: string | number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Relationships
  patient?: Patient;
  createdBy?: User;
}

// Patient Record types
export interface PatientRecord {
  id: number;
  patient_id: number;
  appointment_id?: number;
  treatment_notes: string;
  diagnosis: string;
  procedures_performed: string[];
  recommendations?: string;
  follow_up_instructions?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Relationships
  patient?: Patient;
  appointment?: Appointment;
  createdBy?: User;
}

// Notification types
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read_at?: string;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: ValidationErrors;
}

export interface ValidationErrors {
  [key: string]: string | string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// Form Data types
export interface AppointmentFormData {
  patient_id: number | string;
  doctor_id: number | string;
  service_id: number | string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes?: number;
  notes?: string;
  payment_method?: PaymentMethod;
}

export interface ServiceFormData {
  name: string;
  description?: string;
  price: number | string;
  duration_minutes: number | string;
  category: ServiceCategory;
  is_active?: boolean;
}

export interface ScheduleFormData {
  staff_id: number | string;
  date: string;
  start_time: string;
  end_time: string;
  is_available?: boolean;
  notes?: string;
}

export interface PatientFormData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  medical_history?: string;
  allergies?: string;
  emergency_contact?: string;
}

export interface FinancialRecordFormData {
  appointment_id?: number;
  patient_id: number | string;
  amount: number | string;
  payment_method: PaymentMethod;
  transaction_date: string;
  description?: string;
}

// Dashboard/Stats types
export interface DashboardStats {
  total_appointments: number;
  total_patients: number;
  total_revenue: number;
  pending_appointments: number;
  today_appointments?: number;
  week_appointments?: number;
  month_revenue?: number;
}

export interface TimeSlot {
  time: string;
  display?: string;
  available: boolean;
}

// Props types for common components
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

export interface FilterOptions {
  search?: string;
  status?: string;
  role?: UserRole;
  date_from?: string;
  date_to?: string;
  [key: string]: any;
}
