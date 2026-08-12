import React, { useState, useEffect } from 'react';
import apiPatient from '@/services/ApiPatient';
import AppLayout from '@/layouts/app-layout';
import { formatAppointmentDate, formatAppointmentTime } from '@/utils/dateTime';
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface Appointment {
  id: number;
  doctor: { id: number; name: string };
  service: { id: number; name: string; duration_minutes: number; price: number };
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function PatientRescheduleAppointment({ appointmentId }: { appointmentId: number }) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, any>>({});
  const [isRaceMode, setIsRaceMode] = useState(false);
  const [raceCountdown, setRaceCountdown] = useState(0);

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  useEffect(() => {
    if (appointment && newDate) {
      fetchAvailableSlots();
    }
  }, [newDate]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const response = await apiPatient.getAppointment(appointmentId);
      const data = response?.data || response;
      setAppointment(data);

      // Set initial date to current appointment date
      setNewDate(data.appointment_date.split('T')[0]);
    } catch (error) {
      console.error('Error fetching appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!appointment) return;

    try {
      setLoadingSlots(true);
      const response = await apiPatient.getAvailableSlots({
        doctor_id: appointment.doctor.id.toString(),
        date: newDate
      });

      const slots = response?.slots || response?.data?.slots || [];
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching slots:', error);
      // Mock data for demonstration
      setAvailableSlots([
        { time: '09:00', available: true },
        { time: '09:30', available: true },
        { time: '10:00', available: false },
        { time: '10:30', available: true },
        { time: '11:00', available: true },
        { time: '14:00', available: true },
        { time: '14:30', available: false },
        { time: '15:00', available: true },
        { time: '15:30', available: true },
        { time: '16:00', available: true }
      ]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async () => {
    if (!appointment || !newDate || !newTime) {
      setFormErrors({
        appointment_date: !newDate ? 'Please select a date' : undefined,
        appointment_time: !newTime ? 'Please select a time' : undefined
      });
      return;
    }

    try {
      setSubmitting(true);
      setFormErrors({});

      // Prepare data for API
      const updateData = {
        service_id: appointment.service.id,
        doctor_id: appointment.doctor.id,
        appointment_date: newDate,
        appointment_time: newTime,
        notes: appointment.notes || undefined,
        duration_minutes: appointment.service.duration_minutes,
        status: 'confirmed'
      };

      console.log('Submitting reschedule data:', updateData);

      const response = await apiPatient.rescheduleAppointment(appointment.id, updateData);

      // Handle race case response for rescheduling
      if (response?.data?.race_case) {
        // Rescheduled appointment is in race mode - show pending confirmation
        setIsRaceMode(true);
        setRaceCountdown(response?.data?.confirmation_window || 120);

        // Start countdown timer
        const interval = setInterval(() => {
          setRaceCountdown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              // After countdown, redirect to appointments page
              setTimeout(() => {
                window.location.href = `/patient/appointments/${appointment.id}`;
              }, 1000);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Also redirect after the confirmation window
        setTimeout(() => {
          clearInterval(interval);
          window.location.href = `/patient/appointments/${appointment.id}`;
        }, (response?.data?.confirmation_window || 120) * 1000 + 2000);
      } else {
        // Regular reschedule - redirect immediately
        window.location.href = `/patient/appointments/${appointment.id}`;
      }
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      if (error?.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: error.message || 'Failed to reschedule appointment' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return formatAppointmentDate(date, 'en-PH', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const minDate = new Date().toISOString().split('T')[0];

  const getErr = (val?: any) => (Array.isArray(val) ? val[0] : val) as string | undefined;

  if (loading) {
    return (
      <AppLayout>
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading appointment...</p>
        </div>
      </div>
      </AppLayout>
    );
  }

  if (!appointment) {
    return (
      <AppLayout>
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">Appointment not found</p>
          <a href="/patient/appointments" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
            Back to Appointments
          </a>
        </div>
      </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
    <div className="min-h-screen bg-gray-50">
      {/* Race Mode Pending Confirmation Screen */}
      {isRaceMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Rescheduling in Progress</h2>
              <p className="text-gray-600">Your appointment reschedule request is being processed in a race case scenario.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 mb-3">Confirmation will be completed in:</p>
              <p className="text-4xl font-bold text-blue-600">
                {Math.floor(raceCountdown / 60)}:{String(raceCountdown % 60).padStart(2, '0')}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-amber-700">
                <strong>First-come-first-served:</strong> Your rescheduled appointment is secure if no one books this new slot within the next 2 minutes. You will receive an email confirmation or notification if the new slot is taken.
              </p>
            </div>

            <p className="text-sm text-gray-500">
              You will be redirected shortly...
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <a
              href={`/patient/appointments/${appointment.id}`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </a>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reschedule Appointment</h1>
              <p className="text-gray-600 mt-1">Choose a new date and time</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {formErrors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="text-red-800">{formErrors.general}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Appointment Info */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Appointment</h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(appointment.appointment_date)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium text-gray-900">
                    {formatAppointmentTime(appointment.appointment_time)}
                  </span>
                </div>
              </div>
            </div>

            {/* Select New Date */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select New Date</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose a date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => {
                    setNewDate(e.target.value);
                    setNewTime(''); // Reset time when date changes
                  }}
                  min={minDate}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    formErrors.appointment_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.appointment_date && (
                  <p className="text-red-500 text-sm mt-1">{getErr(formErrors.appointment_date)}</p>
                )}
              </div>
            </div>

            {/* Select New Time */}
            {newDate && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select New Time</h2>

                {loadingSlots ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                    <p className="text-gray-600">Loading available slots...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No available slots for this date</p>
                    <p className="text-sm text-gray-500 mt-1">Please select a different date</p>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setNewTime(slot.time)}
                          disabled={!slot.available}
                          className={`p-3 rounded-lg border-2 text-center font-medium transition-colors ${
                            newTime === slot.time
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : slot.available
                              ? 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-900'
                              : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {formatAppointmentTime(slot.time)}
                        </button>
                      ))}
                    </div>
                    {formErrors.appointment_time && (
                      <p className="text-red-500 text-sm">{getErr(formErrors.appointment_time)}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Comparison */}
            {newDate && newTime && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-medium text-blue-900 mb-3">Reschedule Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium mb-2">Current</p>
                    <p className="text-blue-900">{formatDate(appointment.appointment_date)}</p>
                    <p className="text-blue-900">{formatAppointmentTime(appointment.appointment_time)}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium mb-2">New</p>
                    <p className="text-blue-900">{formatDate(newDate)}</p>
                    <p className="text-blue-900">{formatAppointmentTime(newTime)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Appointment Details */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Service</p>
                  <p className="font-medium text-gray-900">{appointment.service.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Doctor</p>
                  <p className="font-medium text-gray-900">Dr. {appointment.doctor.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="font-medium text-gray-900">{appointment.service.duration_minutes} minutes</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Fee</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(appointment.service.price)}</p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <button
                onClick={handleSubmit}
                disabled={!newDate || !newTime || submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirm Reschedule
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                You will receive a confirmation email once the reschedule is processed
              </p>
            </div>

            {/* Info Banner */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900 text-sm">Important</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please reschedule at least 24 hours before your appointment to avoid cancellation fees.
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
