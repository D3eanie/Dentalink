import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiStaff from '@/services/ApiStaff';
import { computePaymentStatus } from '@/utils/financialStatus';
import { usePage } from '@inertiajs/react';
import { formatAppointmentDateTime, formatAppointmentTime } from '@/utils/dateTime';
import {
  Calendar,
  Clock,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  UserCheck,
  Phone,
  RefreshCw,
  Activity,
  User,
  PhilippinePeso,
  CreditCard
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Swal from 'sweetalert2';

// ---------- Types ----------
interface FinancialRecord {
  id: number;
  amount: number;
  payment_status: 'pending' | 'paid' | 'partial' | 'overdue';
  payment_method: string | null;
  transaction_date: string;
  description: string;
}

interface Appointment {
  id: number;
  patient: { id: number; name: string; phone: string };
  doctor: { id: number; name: string };
  service: { id: number; name: string; duration_minutes: number; price: number };
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'not_available' | 'completed' | 'cancelled' | 'no_show';
  notes: string;
  created_at: string;
  financial_records?: FinancialRecord[];
  financial_record?: FinancialRecord; // Single record (first one)
  balance?: string | number; // Remaining balance for unpaid services
}

interface AppointmentFilters {
  date: string;
  status: string;
  doctor: string;
  patient: string;
}

interface AppointmentFormData {
  patient_id: string;
  doctor_id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  notes: string;
  status?: string;
}

interface Doctor {
  id: number;
  name: string;
  position: string;
}

interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price: number;
}

// ---------- Constants ----------
const initialFormData: AppointmentFormData = {
  patient_id: '',
  doctor_id: '',
  service_id: '',
  appointment_date: '',
  appointment_time: '',
  notes: '',
  status: 'scheduled'
};

const appointmentStatuses = [
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  { value: 'checked_in', label: 'Checked In', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'not_available', label: 'Not Available', color: 'bg-gray-100 text-gray-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  { value: 'no_show', label: 'No Show', color: 'bg-gray-100 text-gray-800' }
];

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
];

const breadcrumbs = [
  { title: 'Dashboard', href: '/admin/dashboard' },
  { title: 'Appointments', href: '/admin/appointments' }
];

// ---------- Helper Functions ----------
const getErr = (val?: any) => (Array.isArray(val) ? val[0] : val) as string | undefined;

const formatDateTime = (date: string, time: string) => {
  return formatAppointmentDateTime(date, time, 'en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

const getStatusColor = (status: string) =>
  appointmentStatuses.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800';

const computeStatsFromAppointments = (appointments: Appointment[]) => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return null;
    // Parse the date as local time to avoid timezone conversion issues
    const dateOnly = dateStr.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);

    if (Number.isNaN(parsed.getTime())) {
      // Attempt to handle ISO strings with time components
      return null;
    }
    return parsed;
  };

  let todayCount = 0;
  let weekCount = 0;
  let completed = 0;
  let cancelled = 0;

  appointments.forEach((appointment) => {
    const apptDate = normalizeDate(appointment.appointment_date);
    if (!apptDate) return;

    if (apptDate.toDateString() === today.toDateString()) {
      todayCount += 1;
    }
    if (apptDate >= startOfWeek && apptDate <= endOfWeek) {
      weekCount += 1;
    }
    if (appointment.status === 'completed') {
      completed += 1;
    }
    if (appointment.status === 'cancelled') {
      cancelled += 1;
    }
  });

  return {
    today: todayCount,
    thisWeek: weekCount,
    completed,
    cancelled,
  };
};

// ---------- Main Component ----------
export default function AppointmentsPage() {
  // State management
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal and form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState<AppointmentFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [isPartialPaymentSubmitting, setIsPartialPaymentSubmitting] = useState(false);

  // Load dropdowns whenever modal opens (create or edit)
  useEffect(() => {
    if (isModalOpen) {
      fetchDropdownData();
    }
  }, [isModalOpen, selectedAppointment, isEditMode]);

  // Filter state - FIXED: Default to empty date to show all appointments
  const [filters, setFilters] = useState<AppointmentFilters>({
    date: '', // Changed from today's date to empty string
    status: '',
    doctor: '',
    patient: ''
  });

  // Stats state
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    completed: 0,
    cancelled: 0
  });

  // Appointment list popup state
  const [selectedDateAppointments, setSelectedDateAppointments] = useState<Appointment[]>([]);
  const [showAppointmentsList, setShowAppointmentsList] = useState(false);
  const [isLoadingAppointmentsList, setIsLoadingAppointmentsList] = useState(false);

  // ---------- API Functions ----------

  // Fetch appointments from API
  const fetchAppointments = async () => {
    try {
      setLoading(true);

      // Clean filters - only send non-empty values
      const cleanedFilters: Record<string, any> = {};
      if (filters.date) cleanedFilters.date = filters.date;
      if (filters.status) cleanedFilters.status = filters.status;
      if (filters.doctor) cleanedFilters.doctor = filters.doctor;
      if (filters.patient) cleanedFilters.patient = filters.patient;

      const response = await apiStaff.getAppointments(cleanedFilters);

      // Handle different response structures
      let appointmentsList = [];
      let statsData = {};

      if (response?.data) {
        appointmentsList = Array.isArray(response.data) ? response.data : (response.data.data || response.data.appointments || []);
        statsData = response.data.stats || response.stats || {};
      } else {
        appointmentsList = response.appointments || response || [];
        statsData = response.stats || {};
      }

      setAppointments(appointmentsList);

      const derivedStats = computeStatsFromAppointments(appointmentsList);

      setStats({
        today: Number(
          statsData && Object.keys(statsData).length > 0
            ? statsData.today ?? derivedStats.today
            : derivedStats.today
        ),
        thisWeek: Number(
          statsData && Object.keys(statsData).length > 0
            ? statsData.thisWeek ?? derivedStats.thisWeek
            : derivedStats.thisWeek
        ),
        completed: Number(
          statsData && Object.keys(statsData).length > 0
            ? statsData.completed ?? derivedStats.completed
            : derivedStats.completed
        ),
        cancelled: Number(
          statsData && Object.keys(statsData).length > 0
            ? statsData.cancelled ?? derivedStats.cancelled
            : derivedStats.cancelled
        ),
      });
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const auth = usePage().props.auth;
  // Fetch dropdown data for forms
  const fetchDropdownData = async () => {
    try {
      // Fallback for getUsersByRole method availability
      const getUsersByRole = async (role: string) => {
        if (typeof apiStaff.getUsersByRole === 'function') {
          return apiStaff.getUsersByRole(role);
        }
        // Fallback to direct API call
        const response = await fetch(`/api/users/role/${role}`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        return data.data || data;
      };

      if (auth.user.role === 'admin') {
        const [patientsRes, doctorsRes, servicesRes] = await Promise.all([
          apiStaff.getPatients({}),
          getUsersByRole('staff'),
          apiStaff.getServices({ is_active: 1 }),
        ]);

        const doctorsList =
          doctorsRes?.data?.data ||
          doctorsRes?.data ||
          doctorsRes?.users ||
          doctorsRes?.staff ||
          doctorsRes ||
          [];

        const patientsList =
          patientsRes?.data?.data ||
          patientsRes?.data ||
          patientsRes?.users ||
          patientsRes?.patients ||
          patientsRes ||
          [];

        const servicesList =
          servicesRes?.data?.data ||
          servicesRes?.data ||
          servicesRes?.services ||
          servicesRes ||
          [];

        setDoctors(doctorsList);
        setPatients(patientsList);
        setServices(servicesList);
        return;
      }

      if (auth.user.role === 'staff') {
        const [patientsRes, servicesRes] = await Promise.all([
          apiStaff.getPatients({}),
          apiStaff.getServices({ is_active: 1 }),
        ]);

        const patientsList =
          patientsRes?.data?.data ||
          patientsRes?.data ||
          patientsRes?.users ||
          patientsRes?.patients ||
          patientsRes ||
          [];

        const servicesList =
          servicesRes?.data?.data ||
          servicesRes?.data ||
          servicesRes?.services ||
          servicesRes ||
          [];

        const staffDoctor = {
          id: auth.user.id,
          name: auth.user.name,
          position: auth.user.position || 'Staff',
        };

        setDoctors([staffDoctor]);
        setPatients(patientsList);
        setServices(servicesList);

        setFormData((prev) => ({
          ...prev,
          doctor_id: staffDoctor.id.toString(),
          patient_id: isEditMode && selectedAppointment ? selectedAppointment.patient.id.toString() : prev.patient_id,
        }));
        return;
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      setDoctors([]);
      setPatients([]);
      setServices([]);
    }
  };

  // FIXED: Check for duplicate appointments
  const checkForDuplicateAppointment = (data: AppointmentFormData): boolean => {
    const isDuplicate = appointments.some(apt => {
      // Skip checking against the current appointment being edited
      if (isEditMode && selectedAppointment && apt.id === selectedAppointment.id) {
        return false;
      }

      // Check if same doctor, date, time, and not cancelled
      const isSameDoctor = apt.doctor.id.toString() === data.doctor_id;
      const isSameDate = apt.appointment_date.split('T')[0] === data.appointment_date;
      const isSameTime = apt.appointment_time.slice(0, 5) === data.appointment_time;
      const isNotCancelled = !['cancelled', 'no_show'].includes(apt.status);

      return isSameDoctor && isSameDate && isSameTime && isNotCancelled;
    });

    return isDuplicate;
  };

  // Fetch appointments for selected doctor and date
  const fetchDoctorDateAppointments = async () => {
    if (!formData.doctor_id || !formData.appointment_date) {
      setSelectedDateAppointments([]);
      setShowAppointmentsList(false);
      return;
    }

    try {
      setIsLoadingAppointmentsList(true);
      // Filter appointments from the already loaded list
      const doctorAppointmentsForDate = appointments.filter(apt => {
        const isSameDoctor = apt.doctor.id.toString() === formData.doctor_id;
        const isSameDate = apt.appointment_date.split('T')[0] === formData.appointment_date;
        const isNotCancelled = !['cancelled', 'no_show'].includes(apt.status);
        return isSameDoctor && isSameDate && isNotCancelled;
      });
      setSelectedDateAppointments(doctorAppointmentsForDate);
      // Show popup as soon as both doctor and date are selected
      setShowAppointmentsList(true);
    } catch (error) {
      console.error('Error fetching doctor date appointments:', error);
      setSelectedDateAppointments([]);
      setShowAppointmentsList(false);
    } finally {
      setIsLoadingAppointmentsList(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchAppointments();
  }, [filters]);

  useEffect(() => {
    fetchDoctorDateAppointments();
  }, [formData.doctor_id, formData.appointment_date, appointments]);

  // ---------- Form Handlers ----------

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (isSubmitting) return;

    // FIXED: Validate appointment date and time
    const appointmentDate = new Date(`${formData.appointment_date}T${formData.appointment_time}`);
    const now = new Date();

    if (appointmentDate < now) {
      setFormErrors({ appointment_date: ['Appointment date and time must be in the future'] });
      return;
    }

    // FIXED: Check for duplicate appointments
    if (checkForDuplicateAppointment(formData)) {
      setFormErrors({
        appointment_time: ['This doctor already has an appointment at this date and time. Please choose a different time.']
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const submitData = {
        patient_id: parseInt(formData.patient_id),
        doctor_id: parseInt(formData.doctor_id),
        service_id: parseInt(formData.service_id),
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        notes: formData.notes || null,
        ...(isEditMode && { status: formData.status })
      };

      if (isEditMode && selectedAppointment) {
        await apiStaff.updateAppointment(selectedAppointment.id, submitData);
      } else {
        await apiStaff.createAppointment(submitData);
      }

      // Close modal and reset form
      setIsModalOpen(false);
      setFormData(initialFormData);
      setSelectedAppointment(null);
      setIsEditMode(false);

      // Refresh appointments list
      await fetchAppointments();

    } catch (error: any) {
      // Handle validation errors from the API response
      if (error?.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else if (error?.message) {
        setFormErrors({ general: [error.message] });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle appointment deletion
  const handleDelete = async (appointment: Appointment) => {
    try {
      await apiStaff.deleteAppointment(appointment.id);
      await fetchAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  // Handle edit appointment
  const handleEdit = async (appointment: Appointment) => {
    console.log("Editing appointment:", appointment); // Debug

    setSelectedAppointment(appointment);

    // Safe time parsing
    let timeValue = appointment.appointment_time || "";
    if (timeValue.includes(" ")) timeValue = timeValue.split(" ")[1];
    if (timeValue.length > 5) timeValue = timeValue.slice(0, 5);

    // Prevent crashes by safely accessing nested objects
    setFormData({
        patient_id: appointment?.patient?.id?.toString() || "",
        doctor_id: appointment?.doctor?.id?.toString() || "",
        service_id: appointment?.service?.id?.toString() || "",
        appointment_date: appointment?.appointment_date?.split("T")[0] || "",
        appointment_time: timeValue || "",
        notes: appointment?.notes || "",
        status: appointment?.status || "scheduled"
    });

    setIsEditMode(true);
    setFormErrors({});

    setIsModalOpen(true);
  };

  // Handle create new appointment
  const handleCreateNew = async () => {
    setSelectedAppointment(null);
    setFormData(initialFormData);
    setIsEditMode(false);
    setFormErrors({});
    setShowAppointmentsList(false);
    setSelectedDateAppointments([]);
    setIsModalOpen(true);
  };

  // ---------- Filter Handlers ----------

  const handleFilterChange = (key: keyof AppointmentFilters, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const clearFilters = () =>
    setFilters({ date: '', status: '', doctor: '', patient: '' }); // FIXED: Clear to empty strings

  // ---------- Status Action Handlers ----------

  const handleCheckIn = async (appointment: Appointment) => {
    // Redirect to tooth records form instead of checking in directly
    window.location.href = `/staff/appointments/${appointment.id}/tooth-records`;
  };

  const handleComplete = async (appointment: Appointment) => {
    try {
      await apiStaff.completeAppointment(appointment.id);
      // Redirect to financial form with appointment ID after short delay for success message
      setTimeout(() => {
        window.location.href = `/staff/financial?appointment_id=${appointment.id}`;
      }, 2500);
    } catch (error) {
      console.error('Error completing appointment:', error);
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    try {
      await apiStaff.cancelAppointment(appointment.id, 'Cancelled by staff');
      await fetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
  };

  // Quick confirm handler
  const handleQuickConfirm = async (appointment: Appointment) => {
    try {
      await apiStaff.quickConfirmAppointment(appointment.id);
      await fetchAppointments();
    } catch (error) {
      console.error('Error confirming appointment:', error);
    }
  };

  // Payment confirmation state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<Appointment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const handleConfirmPayment = async (appointment: Appointment) => {
    setSelectedAppointmentForPayment(appointment);
    setPaymentMethod('cash');
    setPaymentNotes('');
    setShowPaymentDialog(true);
  };

  const submitPaymentConfirmation = async () => {
    if (!selectedAppointmentForPayment) return;
    if (isPaymentSubmitting) return;

    try {
      setIsPaymentSubmitting(true);
      await apiStaff.confirmAppointmentPayment(
        selectedAppointmentForPayment.id,
        paymentMethod,
        paymentNotes
      );
      setShowPaymentDialog(false);
      setSelectedAppointmentForPayment(null);
      await fetchAppointments();
    } catch (error) {
      console.error('Error confirming payment:', error);
    } finally {
      setIsPaymentSubmitting(false);
    }
  };

  // Partial Payment Modal States
  const [isPartialPaymentModalOpen, setIsPartialPaymentModalOpen] = useState(false);
  const [partialPaymentAppointment, setPartialPaymentAppointment] = useState<Appointment | null>(null);
  const [remainingBalance, setRemainingBalance] = useState<number>(0);
  const [partialPaymentForm, setPartialPaymentForm] = useState({
    amount: '',
    payment_method: '',
    notes: ''
  });
  const [partialPaymentErrors, setPartialPaymentErrors] = useState<Record<string, string[]>>({});

  const handleOpenPartialPaymentModal = async (appointment: Appointment) => {
    // First, try to get balance from appointment.balance
    let appointmentBalance = appointment.balance ? Number(appointment.balance) : null;

    // If appointment.balance is not set, calculate from latest financial record
    if (appointmentBalance === null || appointmentBalance <= 0) {
      const financialRecords = appointment.financial_records || (appointment.financial_record ? [appointment.financial_record] : []);
      if (financialRecords && financialRecords.length > 0) {
        // Get the latest financial record
        const latestRecord = financialRecords.reduce((latest: any, current: any) => {
          if (!latest) return current;
          const latestDate = new Date(latest.transaction_date || latest.created_at || 0).getTime();
          const currentDate = new Date(current.transaction_date || current.created_at || 0).getTime();
          return currentDate > latestDate ? current : latest;
        }, null as any);

        if (latestRecord && latestRecord.balance) {
          appointmentBalance = Number(latestRecord.balance);
        }
      }
    }

    // If still no balance found, show error
    if (!appointmentBalance || appointmentBalance <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Remaining Balance',
        text: 'This appointment has no remaining balance to pay.',
        confirmButtonColor: '#3B82F6'
      });
      return;
    }

    try {
      setPartialPaymentAppointment(appointment);
      setPartialPaymentErrors({});
      setRemainingBalance(appointmentBalance);
      setPartialPaymentForm({
        amount: appointmentBalance.toString(),
        payment_method: 'cash',
        notes: ''
      });
      setIsPartialPaymentModalOpen(true);
    } catch (error) {
      console.error('Error opening partial payment modal:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load payment information.',
        confirmButtonColor: '#EF4444'
      });
    }
  };

  const handleSubmitPartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partialPaymentAppointment) return;
    if (isPartialPaymentSubmitting) return;

    try {
      setIsPartialPaymentSubmitting(true);
      setPartialPaymentErrors({});

      // Validate
      const errors: Record<string, string[]> = {};

      if (!partialPaymentForm.amount || parseFloat(partialPaymentForm.amount) <= 0) {
        errors.amount = ['Amount must be greater than 0'];
      }

      if (parseFloat(partialPaymentForm.amount) > remainingBalance) {
        errors.amount = ['Amount cannot exceed remaining balance'];
      }

      if (!partialPaymentForm.payment_method) {
        errors.payment_method = ['Payment method is required'];
      }

      if (Object.keys(errors).length > 0) {
        setPartialPaymentErrors(errors);
        return;
      }

      // Get the first financial record for this appointment
      const financialRecords = partialPaymentAppointment.financial_records ||
                              (partialPaymentAppointment.financial_record ? [partialPaymentAppointment.financial_record] : []);
      const parentRecord = financialRecords.reduce((latest: any, current: any) => {
        if (!latest) return current;
        const latestDate = new Date(latest.transaction_date || latest.created_at || 0).getTime();
        const currentDate = new Date(current.transaction_date || current.created_at || 0).getTime();
        return currentDate > latestDate ? current : latest;
      }, null as any);

      if (!parentRecord) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No financial record found for this appointment.',
          confirmButtonColor: '#EF4444'
        });
        return;
      }

      // Submit follow-up payment
      const response = await apiStaff.createPartialPaymentFollowUp(parentRecord.id, {
        amount: parseFloat(partialPaymentForm.amount),
        payment_method: partialPaymentForm.payment_method,
        notes: partialPaymentForm.notes
      });

      if (response.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Follow-up payment recorded successfully.',
          confirmButtonColor: '#3B82F6'
        });
        setIsPartialPaymentModalOpen(false);
        setPartialPaymentAppointment(null);
        await fetchAppointments();
      }
    } catch (error) {
      console.error('Error submitting partial payment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to record follow-up payment.',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setIsPartialPaymentSubmitting(false);
    }
  };

  // ---------- Render Component ----------
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Appointments Management" />

      <div className="flex flex-col gap-6 p-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments Management</h1>
            <p className="text-gray-600">Manage patient appointments and schedules</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAppointments}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Book Appointment
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-red-900">{stats.cancelled}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by patient name..."
                  value={filters.patient}
                  onChange={(e) => handleFilterChange('patient', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <input
                type="date"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                placeholder="Filter by date"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                {appointmentStatuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
              <select
                value={filters.doctor}
                onChange={(e) => handleFilterChange('doctor', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Doctors</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id.toString()}>Dr. {doctor.name}</option>
                ))}
              </select>
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor & Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center items-center">
                        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                        Loading appointments...
                      </div>
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <Calendar className="w-12 h-12 text-gray-300 mb-2" />
                        <p>No appointments found</p>
                        <p className="text-sm text-gray-400">Try adjusting your filters or create a new appointment</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  appointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50 transition-colors">
                      {/* Patient Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patient.name}
                            </div>
                            {appointment.patient.phone && (
                              <div className="text-sm text-gray-500 flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {appointment.patient.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Doctor & Service Info */}
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Dr. {appointment.doctor.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.service.name}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            {appointment.service.duration_minutes} min • {formatCurrency(appointment.service.price)}
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(appointment.appointment_date, appointment.appointment_time)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                            {appointmentStatuses.find(s => s.value === appointment.status)?.label || appointment.status}
                          </span>
                          {appointment.status === 'completed' && (
                            <div className="mt-1">
                              {(() => {
                                // Status is based on appointment.balance, not financial_records
                                const appointmentBalance = Number(appointment.balance || 0);

                                if (appointmentBalance > 0) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                      <PhilippinePeso className="w-3 h-3" />
                                      Partial - ₱{appointmentBalance.toFixed(2)} remaining
                                    </span>
                                  );
                                }

                                // Balance == 0, show Paid
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3" />
                                    Paid
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {appointment.status === 'scheduled' && (
                            <button
                              onClick={() => handleQuickConfirm(appointment)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Quick Confirm"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {appointment.status === 'confirmed' && (
                            <button
                              onClick={() => handleCheckIn(appointment)}
                              className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title="Check In"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}

                          {appointment.status === 'checked_in' && (
                            <button
                              onClick={() => handleComplete(appointment)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Complete"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {appointment.status === 'completed' && (() => {
                            // Button visible if appointment has remaining balance
                            const appointmentBalance = Number(appointment.balance || 0);

                            if (appointmentBalance > 0) {
                              return (
                                <button
                                  onClick={() => handleOpenPartialPaymentModal(appointment)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Record Follow-up Payment"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </button>
                              );
                            }

                            return null;
                          })()}

                          <button
                            onClick={() => handleEdit(appointment)}
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {['scheduled', 'confirmed'].includes(appointment.status) && (
                            <button
                              onClick={() => handleCancel(appointment)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Cancel"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(appointment)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Appointment Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                {isEditMode ? 'Edit Appointment' : 'Book New Appointment'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* General Error */}
                {formErrors.general && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {getErr(formErrors.general)}
                  </div>
                )}

                {/* Patient & Doctor Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Patient *
                    </label>
                    <select
                      value={formData.patient_id}
                      onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.patient_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="">Select patient</option>
                      {patients.length === 0 ? (
                        <option value="" disabled>(No patients available)</option>
                      ) : (
                        patients.map(patient => (
                          <option key={patient.id} value={patient.id.toString()}>
                            {patient.name}
                          </option>
                        ))
                      )}
                    </select>
                    {formErrors.patient_id && (
                      <p className="text-red-500 text-sm mt-1">{getErr(formErrors.patient_id)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Doctor *
                    </label>
                    <select
                      value={formData.doctor_id}
                      onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.doctor_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="">Select doctor</option>
                      {doctors.map(doctor => (
                          <option key={doctor.id} value={doctor.id.toString()}>
                            Dr. {doctor.name}
                          </option>
                        ))
                      }
                    </select>
                    {formErrors.doctor_id && (
                      <p className="text-red-500 text-sm mt-1">{getErr(formErrors.doctor_id)}</p>
                    )}
                  </div>
                </div>

                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service *
                  </label>
                  <select
                    value={formData.service_id}
                    onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.service_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select service</option>
                    {services.length === 0 ? (
                      <option value="" disabled>(No services available)</option>
                    ) : (
                      services.map(service => (
                        <option key={service.id} value={service.id.toString()}>
                          {service.name} - {service.duration_minutes} min ({formatCurrency(service.price)})
                        </option>
                      ))
                    )}
                  </select>
                  {formErrors.service_id && (
                    <p className="text-red-500 text-sm mt-1">{getErr(formErrors.service_id)}</p>
                  )}
                </div>

                {/* Status Field - Only show when editing */}
                {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      value={formData.status || 'scheduled'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.status ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {appointmentStatuses.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.status && (
                      <p className="text-red-500 text-sm mt-1">{getErr(formErrors.status)}</p>
                    )}
                  </div>
                )}

                {/* Date & Time Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Appointment Date *
                    </label>
                    <input
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.appointment_date ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {formErrors.appointment_date && (
                      <p className="text-red-500 text-sm mt-1">{getErr(formErrors.appointment_date)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Appointment Time *
                    </label>
                    <input
                      type="time"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.appointment_time ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {formErrors.appointment_time && (
                      <p className="text-red-500 text-sm mt-1">{getErr(formErrors.appointment_time)}</p>
                    )}
                  </div>
                </div>

                {/* Doctor's Appointments for Selected Date - Popup Notes */}
                {showAppointmentsList && formData.doctor_id && formData.appointment_date && (
                  <div className={`border-2 rounded-lg p-4 ${
                    selectedDateAppointments.length > 0
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-green-50 border-green-300'
                  }`}>
                    <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                      selectedDateAppointments.length > 0
                        ? 'text-blue-900'
                        : 'text-green-900'
                    }`}>
                      <Calendar className="w-4 h-4" />
                      {doctors.find(d => d.id.toString() === formData.doctor_id) ? (
                        <>
                          Dr. {doctors.find(d => d.id.toString() === formData.doctor_id)?.name}'s Schedule on {(() => {
                            const [year, month, day] = formData.appointment_date.split('-').map(Number);
                            return new Date(year, month - 1, day).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
                          })()}
                        </>
                      ) : (
                        'Doctor Schedule'
                      )}
                    </h3>

                    {selectedDateAppointments.length > 0 ? (
                      <>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedDateAppointments.map((apt, index) => (
                            <div key={apt.id} className="bg-white rounded p-3 border border-blue-200 flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">
                                      <Clock className="inline w-3 h-3 mr-1" />
                                      {formatAppointmentTime(apt.appointment_time)}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {apt.patient.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {apt.service.name} • {apt.service.duration_minutes} min
                                    </p>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded font-semibold ${getStatusColor(apt.status)}`}>
                                    {appointmentStatuses.find(s => s.value === apt.status)?.label}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-blue-700 mt-3 italic">
                          Note: The doctor has {selectedDateAppointments.length} appointment{selectedDateAppointments.length !== 1 ? 's' : ''} on this date. Choose a time that doesn't conflict.
                        </p>
                      </>
                    ) : (
                      <div className="bg-white rounded p-4 border border-green-200">
                        <p className="text-sm text-green-900 font-medium flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Good news! No appointments scheduled for this doctor on this date.
                        </p>
                        <p className="text-xs text-green-700 mt-2">
                          All time slots are available. The doctor is available throughout the day.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Reason for Visit */}
                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Enter additional notes (optional)"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setFormData(initialFormData);
                      setFormErrors({});
                      setSelectedAppointment(null);
                      setIsEditMode(false);
                      setShowAppointmentsList(false);
                      setSelectedDateAppointments([]);
                    }}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isEditMode ? 'Update' : 'Book'} Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Payment Confirmation Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Confirm payment for this completed appointment. The transaction will be marked as paid.
            </DialogDescription>
          </DialogHeader>
          {selectedAppointmentForPayment && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Patient</p>
                <p className="text-lg font-semibold text-gray-900">{selectedAppointmentForPayment.patient.name}</p>
                <p className="text-sm text-gray-600 mt-1">{selectedAppointmentForPayment.service.name}</p>
                {(() => {
                  const financialRecord = selectedAppointmentForPayment.financial_records?.[0] || selectedAppointmentForPayment.financial_record;
                  if (financialRecord) {
                    return (
                      <div className="mt-2">
                        <p className="text-sm text-gray-700">Amount:</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(financialRecord.amount)}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">Amount:</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(selectedAppointmentForPayment.service.price)}
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method *</Label>
                <select
                  id="payment_method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1"
                >
                  {paymentMethodOptions.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="payment_notes">Notes (Optional)</Label>
                <textarea
                  id="payment_notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1"
                  placeholder="Add any additional notes about the payment..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPaymentDialog(false);
                    setSelectedAppointmentForPayment(null);
                    setPaymentMethod('cash');
                    setPaymentNotes('');
                  }}
                  disabled={isPaymentSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitPaymentConfirmation}
                  disabled={isPaymentSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Partial Payment Follow-up Modal */}
      <Dialog open={isPartialPaymentModalOpen} onOpenChange={setIsPartialPaymentModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Follow-up Payment</DialogTitle>
            <DialogDescription>
              Record a follow-up payment for this partial payment appointment.
            </DialogDescription>
          </DialogHeader>
          {partialPaymentAppointment && (
            <form onSubmit={handleSubmitPartialPayment} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Patient</p>
                <p className="text-lg font-semibold text-gray-900">{partialPaymentAppointment.patient.name}</p>
                <p className="text-sm text-gray-600 mt-1">{partialPaymentAppointment.service.name}</p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Service Price:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(partialPaymentAppointment.service.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Remaining Balance:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(remainingBalance)}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="followup_amount">Amount to Pay *</Label>
                <Input
                  id="followup_amount"
                  type="number"
                  step="0.01"
                  value={partialPaymentForm.amount}
                  onChange={(e) => setPartialPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className={`mt-1 ${partialPaymentErrors.amount ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                />
                {partialPaymentErrors.amount && (
                  <p className="text-red-600 text-sm mt-1">{partialPaymentErrors.amount[0]}</p>
                )}
              </div>

              <div>
                <Label htmlFor="followup_method">Payment Method *</Label>
                <select
                  id="followup_method"
                  value={partialPaymentForm.payment_method}
                  onChange={(e) => setPartialPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1 ${
                    partialPaymentErrors.payment_method ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select payment method...</option>
                  {paymentMethodOptions.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                {partialPaymentErrors.payment_method && (
                  <p className="text-red-600 text-sm mt-1">{partialPaymentErrors.payment_method[0]}</p>
                )}
              </div>

              <div>
                <Label htmlFor="followup_notes">Notes (Optional)</Label>
                <textarea
                  id="followup_notes"
                  value={partialPaymentForm.notes}
                  onChange={(e) => setPartialPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1"
                  placeholder="Add any additional notes about the payment..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsPartialPaymentModalOpen(false);
                    setPartialPaymentAppointment(null);
                  }}
                  disabled={isPartialPaymentSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPartialPaymentSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Record Follow-up Payment
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
