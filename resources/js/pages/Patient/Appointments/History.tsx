import React, { useState, useEffect } from 'react';
import apiPatient from  '@/services/ApiPatient';
import AppLayout from '@/layouts/app-layout';
import { formatAppointmentDate, formatAppointmentTime } from '@/utils/dateTime';
import {
  Calendar,
  Clock,
  User,
  Search,
  Filter,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Download
} from 'lucide-react';

interface Appointment {
  id: number;
  doctor: { name: string; specialization?: string };
  service: { name: string; price: number };
  appointment_date: string;
  appointment_time: string;
  status: string;
}

interface Filters {
  status: string;
  year: string;
  search: string;
}

export default function PatientAppointmentHistory() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    status: 'completed',
    year: new Date().getFullYear().toString(),
    search: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0
  });

  useEffect(() => {
    fetchHistory();
  }, [filters.status, filters.year]);

  const fetchHistory = async () => {
    try {
      setLoading(true);

      // Fetch appointments with history status
      const response = await apiPatient.getMyAppointments({
        status: filters.status,
        year: filters.year,
        date_to: new Date().toISOString().split('T')[0] // Only past appointments
      });

      const appointmentsList = response?.data?.data || response?.data || response?.appointments || [];
      setAppointments(appointmentsList);

      // Calculate stats
      const completed = appointmentsList.filter((a: Appointment) => a.status === 'completed').length;
      const cancelled = appointmentsList.filter((a: Appointment) => a.status === 'cancelled').length;
      const no_show = appointmentsList.filter((a: Appointment) => a.status === 'no_show').length;

      setStats({
        total: appointmentsList.length,
        completed,
        cancelled,
        no_show
      });
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return formatAppointmentDate(date, 'en-PH', {
      month: 'short',
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
    const configs: Record<string, { color: string; icon: any }> = {
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
      no_show: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
    };
    return configs[status] || configs.completed;
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'completed',
      year: new Date().getFullYear().toString(),
      search: ''
    });
  };

  const handleExport = () => {
    console.log('Exporting appointment history...');
    // In a real implementation, this would generate a CSV or PDF
  };

  // Filter by search
  const filteredAppointments = appointments.filter(apt => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      apt.doctor.name.toLowerCase().includes(searchLower) ||
      apt.service.name.toLowerCase().includes(searchLower)
    );
  });

  // Get available years
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <AppLayout >
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Appointment History</h1>
              <p className="text-gray-600 mt-1">View your past appointments and medical visits</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchHistory}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Visits</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-gray-600" />
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
                <p className="text-sm font-medium text-gray-600">No Show</p>
                <p className="text-2xl font-bold text-gray-900">{stats.no_show}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search appointments..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mr-2" />
              <span className="text-gray-600">Loading history...</span>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No appointment history found</p>
              <p className="text-gray-400 text-sm mt-1">Your past appointments will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAppointments.map((appointment) => {
                const statusCfg = getStatusConfig(appointment.status);
                const StatusIcon = statusCfg.icon;

                return (
                  <a
                    key={appointment.id}
                    href={`/patient/appointments/${appointment.id}`}
                    className="block p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {appointment.service.name}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusCfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {appointment.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>Dr. {appointment.doctor.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatDate(appointment.appointment_date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{formatAppointmentTime(appointment.appointment_time)}</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400 ml-4" />
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Card */}
        {filteredAppointments.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Your Health Journey</h3>
                <p className="text-sm text-blue-700 mt-1">
                  You've completed {stats.completed} appointment{stats.completed !== 1 ? 's' : ''} this year.
                  Keep up with your health checkups!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div></AppLayout>
  );
}
