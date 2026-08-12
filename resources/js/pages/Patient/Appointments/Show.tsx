import React, { useState, useEffect } from 'react';
import apiPatient from  '@/services/ApiPatient';
import AppLayout from '@/layouts/app-layout';
import { formatAppointmentDateTime } from '@/utils/dateTime';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  PhilippinePeso,
  AlertCircle,
  ArrowLeft,
  Edit,
  XCircle,
  CheckCircle,
  Printer
} from 'lucide-react';

interface AppointmentDetails {
  id: number;
  patient: { id: number; name: string; phone?: string; email?: string };
  doctor: { id: number; name: string; specialization?: string; phone?: string };
  service: { id: number; name: string; description?: string; duration_minutes: number; price: number };
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function PatientAppointmentShow({ appointmentId }: { appointmentId: number }) {
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const response = await apiPatient.getAppointment(appointmentId);
      const data = response?.data || response;
      setAppointment(data);
    } catch (error) {
      console.error('Error fetching appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointment) return;

    try {
      await apiPatient.cancelAppointment(appointment.id);
      await fetchAppointment();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDateTime = (date: string, time: string) => {
    return formatAppointmentDateTime(date, time, 'en-PH', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: Calendar, label: 'Scheduled' },
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Confirmed' },
      checked_in: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Checked In' },
      not_available: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Not Available' },
      completed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle, label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
      no_show: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: 'No Show' }
    };
    return configs[status] || configs.scheduled;
  };

  const canCancel = (appointment: AppointmentDetails) => {
    // normalize status
    const status = appointment.status?.toLowerCase().trim();

    if (!['scheduled', 'confirmed'].includes(status)) return false;

    // strip seconds if present
    const time = appointment.appointment_time.slice(0, 5); // HH:mm

    // always use ISO format for correct parsing
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${time}`);

    if (isNaN(appointmentDateTime.getTime())) {
        console.warn("Invalid appointment date:", appointment.appointment_date, appointment.appointment_time);
        return false;
    }

    return appointmentDateTime > new Date();
  };

  const canReschedule = (appointment: AppointmentDetails) => canCancel(appointment);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Clock className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">Appointment not found</p>
          <a href="/patient/appointments" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
            Back to Appointments
          </a>
        </div>
      </div>
    );
  }

console.log("--------------------------");
console.log("Status:", appointment.status);
console.log("Date:", appointment.appointment_date);
console.log("Time:", appointment.appointment_time);

const time = appointment.appointment_time.slice(0, 5);
console.log("Parsed datetime:", new Date(`${appointment.appointment_date}T${time}`));

console.log("canCancel:", canCancel(appointment));
console.log("canReschedule:", canReschedule(appointment));
console.log("--------------------------");

  return (
    <AppLayout >
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 print:border-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href="/patient/appointments"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 print:hidden"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </a>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Appointment Details</h1>
                <p className="text-gray-600 mt-1">ID: #{appointment.id}</p>
              </div>
            </div>
            <div className="flex gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${statusCfg.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusCfg.label}
          </span>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Appointment Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointment Information</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Date & Time</p>
                    <p className="text-gray-900 mt-1">
                      {formatDateTime(appointment.appointment_date, appointment.appointment_time)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Duration</p>
                    <p className="text-gray-900 mt-1">
                      {appointment.duration_minutes || appointment.service.duration_minutes} minutes
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Service</p>
                    <p className="text-gray-900 mt-1">{appointment.service.name}</p>
                    {appointment.service.description && (
                      <p className="text-sm text-gray-600 mt-1">{appointment.service.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <PhilippinePeso className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Service Fee</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(appointment.service.price)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Card */}
            {appointment.notes && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>

                {appointment.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                      {appointment.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Doctor Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Doctor</h2>

              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Dr. {appointment.doctor.name}</p>
                  {appointment.doctor.specialization && (
                    <p className="text-sm text-gray-600">{appointment.doctor.specialization}</p>
                  )}
                </div>
              </div>

              {appointment.doctor.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{appointment.doctor.phone}</span>
                </div>
              )}
            </div>



            {/* Actions Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 print:hidden">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

              <div className="space-y-3">
                {canReschedule(appointment) && (
                  <a
                    href={`/patient/appointments/${appointment.id}/reschedule`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Reschedule
                  </a>
                )}

                {canCancel(appointment) && (
                  <button
                    onClick={handleCancelAppointment}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Appointment
                  </button>
                )}

                {!canCancel(appointment) && !canReschedule(appointment) && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No actions available for this appointment
                  </div>
                )}
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 print:hidden">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 text-sm">Need Help?</p>
                  <p className="text-sm text-blue-700 mt-1">
                    If you have questions about your appointment, please contact the clinic.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
