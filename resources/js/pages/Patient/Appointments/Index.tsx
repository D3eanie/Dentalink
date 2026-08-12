import React, { useState, useEffect } from 'react';
import apiPatient from '@/services/ApiPatient';
import AppLayout from '@/layouts/app-layout';
import { formatAppointmentDateTime, formatAppointmentDate, formatAppointmentTime } from '@/utils/dateTime';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  User,
  FileText,
  CheckCircle,
  PlusCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  Ban,
  AlertCircle
} from 'lucide-react';

interface Appointment {
  id: number;
  doctor: { id: number; name: string; specialization?: string };
  service: { id: number; name: string; duration_minutes: number; price: number };
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'not_available' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  created_at: string;
}

interface Filters {
  status: string;
  date_from: string;
  date_to: string;
  search: string;
}

const statusConfig = [
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { value: 'checked_in', label: 'Checked In', color: 'bg-yellow-100 text-yellow-800', icon: User },
  { value: 'not_available', label: 'Not Available', color: 'bg-gray-100 text-gray-800', icon: Clock },
  { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
  { value: 'no_show', label: 'No Show', color: 'bg-gray-100 text-gray-800', icon: Ban }
];

export default function PatientAppointmentsIndex() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    status: '',
    date_from: '',
    date_to: '',
    search: ''
  });
  const [stats, setStats] = useState({
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    total: 0
  });

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Clean filters - only send non-empty values
      const cleanedFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value && value.trim() !== '') {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      const response = await apiPatient.getMyAppointments(cleanedFilters);

      let appointmentsList: Appointment[] = [];
      let statsData = {};

      // Handle different response structures
      if (response?.data) {
        appointmentsList = Array.isArray(response.data) ? response.data :
                          (response.data.data || response.data.appointments || []);
        statsData = response.data.stats || response.stats || {};
      } else {
        appointmentsList = response?.appointments || response || [];
        statsData = response?.stats || {};
      }

      // Ensure appointmentsList is an array
      if (!Array.isArray(appointmentsList)) {
        console.warn('Appointments data is not an array:', appointmentsList);
        appointmentsList = [];
      }

      setAppointments(appointmentsList);

      // Calculate or use provided stats
      if (statsData && Object.keys(statsData).length > 0) {
        setStats({
          upcoming: Number(statsData.upcoming || 0),
          completed: Number(statsData.completed || 0),
          cancelled: Number(statsData.cancelled || 0),
          total: Number(statsData.total || 0)
        });
      } else {
        // Calculate stats from appointments list
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = appointmentsList.filter((a: Appointment) => {
          // Parse date as local time
          const dateStr = a.appointment_date.split('T')[0];
          const [year, month, day] = dateStr.split('-').map(Number);
          const aptDate = new Date(year, month - 1, day);
          return ['scheduled', 'confirmed'].includes(a.status) && aptDate >= today;
        }).length;

        const completed = appointmentsList.filter((a: Appointment) =>
          a.status === 'completed'
        ).length;

        const cancelled = appointmentsList.filter((a: Appointment) =>
          a.status === 'cancelled'
        ).length;

        setStats({
          upcoming,
          completed,
          cancelled,
          total: appointmentsList.length
        });
      }
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      const errorMessage = error?.message || 'Failed to load appointments. Please try again.';
      setError(errorMessage);
      apiPatient.showErrorToast(errorMessage);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [filters.status, filters.date_from, filters.date_to, filters.search]);

  /**
   * Format date and time for display in Philippine format
   * Example: "November 19, 2025 at 10:00 AM"
   */
  const formatDateTime = (date: string, time: string) => {
    return formatAppointmentDateTime(date, time, 'en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  /**
   * Format date only
   * Example: "November 19, 2025"
   */
  const formatDate = (date: string) => {
    return formatAppointmentDate(date, 'en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  /**
   * Format date with day of week
   * Example: "Tuesday, November 19, 2025"
   */
  const formatDateWithDay = (date: string) => {
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

  const getStatusConfig = (status: string) => {
    return statusConfig.find(s => s.value === status) || statusConfig[0];
  };

  /**
   * Check if appointment is upcoming (future date and scheduled/confirmed)
   */
  const isUpcoming = (appointment: Appointment) => {
    try {

      const dateOnly = appointment.appointment_date.split("T")[0];
      const cleanTime = appointment.appointment_time?.length > 5
        ? appointment.appointment_time.slice(0, 5)
        : appointment.appointment_time;
        const appointmentDateTime = new Date(`${dateOnly}T${cleanTime}:00`);

      const now = new Date();

      return appointmentDateTime > now && ['scheduled', 'confirmed'].includes(appointment.status);
    } catch (error) {
      console.error('Error checking if appointment is upcoming:', error);
      return false;
    }
  };

  /**
   * Check if appointment can be cancelled
   */
  const canCancel = (appointment: Appointment) => {
    console.log("Checking canCancel:", {
    id: appointment.id,
    status: appointment.status,
    isUpcoming: isUpcoming(appointment),
    date: appointment.appointment_date,
    time: appointment.appointment_time
  });

  return ['scheduled', 'confirmed'].includes(appointment.status) && isUpcoming(appointment);
  };

  /**
   * Handle viewing appointment details
   */
  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  /**
   * Filter appointments based on search term
   */
  const filteredAppointments = appointments.filter(apt => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      apt.doctor.name.toLowerCase().includes(searchLower) ||
      apt.service.name.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
                <p className="text-gray-600 mt-1">View and manage your appointments</p>
              </div>
              <a
                href="/patient/book-appointment"
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                Book New Appointment
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error Loading Appointments</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={fetchAppointments}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cancelled</p>
                  <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by doctor, service, or reason..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  {statusConfig.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="To"
                />
                {(filters.status || filters.date_from || filters.date_to || filters.search) && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={fetchAppointments}
                  className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                  title="Refresh appointments"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mr-2" />
                <span className="text-gray-600">Loading appointments...</span>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-600 font-medium">No appointments found</p>
                <p className="text-gray-400 text-sm mt-1">
                  {filters.search || filters.status || filters.date_from || filters.date_to
                    ? 'Try adjusting your filters'
                    : 'Book your first appointment to get started'}
                </p>
                {!appointments.length && !loading && (
                  <a
                    href="/patient/book-appointment"
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Book Appointment
                  </a>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => {
                  const statusCfg = getStatusConfig(appointment.status);
                  const StatusIcon = statusCfg.icon;
                  const upcoming = isUpcoming(appointment);

                  return (
                    <div
                      key={appointment.id}
                      className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleViewDetails(appointment)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {appointment.service.name}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusCfg.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusCfg.label}
                            </span>
                            {upcoming && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                Upcoming
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span>Dr. {appointment.doctor.name}</span>
                              {appointment.doctor.specialization && (
                                <span className="text-gray-400">• {appointment.doctor.specialization}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span>{formatDateTime(appointment.appointment_date, appointment.appointment_time)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span>{appointment.duration_minutes || appointment.service.duration_minutes} minutes</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span>{formatCurrency(appointment.service.price)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canCancel(appointment) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelAppointment(appointment);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel
                            </button>
                          )}
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Details Modal */}
        {showDetailsModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedAppointment.service.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">Appointment Details</p>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Status */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg ${getStatusConfig(selectedAppointment.status).color}`}>
                      {React.createElement(getStatusConfig(selectedAppointment.status).icon, { className: "w-4 h-4" })}
                      {getStatusConfig(selectedAppointment.status).label}
                    </span>
                  </div>
                </div>

                {/* Doctor Info */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Doctor</label>
                  <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Dr. {selectedAppointment.doctor.name}</p>
                      {selectedAppointment.doctor.specialization && (
                        <p className="text-sm text-gray-600">{selectedAppointment.doctor.specialization}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Date & Time</label>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="text-gray-900 font-medium">
                          {formatDateWithDay(selectedAppointment.appointment_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="text-gray-900 font-medium">
                          {formatAppointmentTime(selectedAppointment.appointment_time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Duration</p>
                        <p className="text-gray-900 font-medium">
                          {selectedAppointment.duration_minutes || selectedAppointment.service.duration_minutes} minutes
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Service Fee</label>
                  <div className="mt-2 text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedAppointment.service.price)}
                  </div>
                </div>

                {/* Notes */}
                {selectedAppointment.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-2 text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  {canCancel(selectedAppointment) && (
                    <button
                      onClick={() => handleCancelAppointment(selectedAppointment)}
                      className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Cancel Appointment
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
