import React, { useState, useEffect } from 'react';
import apiPatient from '@/services/ApiPatient';
import AppLayout from '@/layouts/app-layout';
import { computePaymentStatus } from '@/utils/financialStatus';
import { formatAppointmentDate, formatAppointmentTime } from '@/utils/dateTime';
import {
  Calendar,
  FileText,
  PhilippinePeso,
  AlertCircle,
  CheckCircle,
  User,
  ChevronRight,
  RefreshCw,
  Mail
} from 'lucide-react';

interface DashboardData {
  upcoming_appointments: any[];
  recent_records: any[];
  pending_bills: any[];
  stats: {
    total_appointments: number;
    upcoming_appointments: number;
    medical_records: number;
    pending_payments: number;
  };
  alerts: any[];
}

export default function PatientDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiPatient.getDashboardData();

      setData({
        upcoming_appointments: response.upcoming_appointments || [],
        recent_records: response.recent_records || [],
        pending_bills: response.pending_bills || [],
        stats: response.stats || {
          total_appointments: 0,
          upcoming_appointments: 0,
          medical_records: 0,
          pending_payments: 0
        },
        alerts: response.alerts || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) {
      return 'TBD';
    }
    return formatAppointmentDate(date, 'en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return formatAppointmentTime(time, 'en-PH');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatRecordType = (type?: string) => {
    if (!type) return 'Medical Record';
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Upcoming',
      value: data?.stats.upcoming_appointments || 0,
      icon: Calendar,
      accent: 'from-blue-500/10 to-blue-500/20',
      iconColor: 'text-blue-600'
    },
    {
      label: 'Total Visits',
      value: data?.stats.total_appointments || 0,
      icon: CheckCircle,
      accent: 'from-teal-500/10 to-teal-500/20',
      iconColor: 'text-teal-600'
    },
    {
      label: 'Records',
      value: data?.stats.medical_records || 0,
      icon: FileText,
      accent: 'from-purple-500/10 to-purple-500/20',
      iconColor: 'text-purple-600'
    },
    {
      label: 'Pending',
      value: formatCurrency(data?.stats.pending_payments || 0),
      icon: PhilippinePeso,
      accent: 'from-rose-500/10 to-rose-500/20',
      iconColor: 'text-rose-600'
    }
  ];

  const quickActions = [
    {
      title: 'Book Appointment',
      description: 'Schedule a visit',
      href: '/patient/book-appointment',
      icon: Calendar,
      accent: 'bg-blue-50 text-blue-600',
      hover: 'hover:border-blue-300 hover:bg-blue-50'
    },
    {
      title: 'View Billing',
      description: 'Payment history',
      href: '/patient/billing',
      icon: PhilippinePeso,
      accent: 'bg-green-50 text-green-600',
      hover: 'hover:border-green-300 hover:bg-green-50'
    }
  ];

  return (
    <AppLayout>
      <section className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Greeting */}
          <div className="rounded-3xl border border-white/20 bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 p-6 text-white shadow-2xl sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-white/80">{new Date().toLocaleDateString()}</p>
                <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{greeting}!</h1>
                <p className="mt-2 text-white/90">Here’s your current health overview.</p>
              </div>
              <button
                onClick={fetchDashboardData}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-white/25"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</p>
                  </div>
                  <div className={`rounded-2xl bg-gradient-to-br ${card.accent} p-3`}>
                    <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {data?.alerts && data.alerts.length > 0 && (
            <div className="mt-8 space-y-3">
              {data.alerts.map((alert: any, index: number) => {
                if (alert.type === 'email_verification') {
                  return (
                    <div key={index} className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <p className="font-semibold text-blue-900">{alert.title}</p>
                          <p className="text-sm text-blue-800">{alert.message}</p>
                          <a
                            href="/settings/email-verification"
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                          >
                            Verify now
                            <ChevronRight className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Default yellow alerts for other types
                return (
                  <div key={index} className="rounded-2xl border border-yellow-200 bg-yellow-50/80 p-5">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p>• {alert.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main Content */}
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
            <section className="rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h3>
                </div>
                <a href="/patient/appointments" className="flex items-center text-sm font-medium text-blue-600">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </a>
              </div>
              <div className="p-6">
                {!data?.upcoming_appointments || data.upcoming_appointments.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center text-gray-500">
                    <Calendar className="h-12 w-12 text-gray-300" />
                    <p>No upcoming appointments</p>
                    <a
                      href="/patient/book-appointment"
                      className="inline-flex items-center text-sm font-medium text-blue-600"
                    >
                      Book an appointment
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.upcoming_appointments.slice(0, 3).map((apt: any) => (
                      <div
                        key={apt.id}
                        className="rounded-2xl border border-gray-100 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-2 text-sm text-gray-600">
                            <p className="text-base font-semibold text-gray-900">{apt.service?.name}</p>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>Dr. {apt.doctor?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>
                                {formatDate(apt.appointment_date)} at {formatTime(apt.appointment_time)}
                              </span>
                            </div>
                          </div>
                          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  <p className="text-sm text-gray-500">Stay on top of your care</p>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    {quickActions.map((action) => (
                      <a
                        key={action.title}
                        href={action.href}
                        className={`flex items-center gap-3 rounded-2xl border border-gray-100 p-4 transition ${action.hover}`}
                      >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${action.accent}`}>
                          <action.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{action.title}</p>
                          <p className="text-sm text-gray-500">{action.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* Billing Snapshot */}
          <section className="mt-8 rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-2">
                <PhilippinePeso className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Billing Snapshot</h3>
              </div>
              <a href="/patient/billing" className="flex items-center text-sm font-medium text-blue-600">
                View Bills
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </div>
            <div className="p-6">
              {!data?.pending_bills || data.pending_bills.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center text-gray-500">
                  <PhilippinePeso className="h-12 w-12 text-gray-300" />
                  <p>No outstanding bills</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.pending_bills.slice(0, 3).map((bill: any) => {
                    const billStatus = computePaymentStatus(bill);
                    return (
                    <div
                      key={bill.id}
                      className="rounded-2xl border border-gray-100 p-4 transition hover:bg-gray-50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{bill.description}</p>
                          <p className="text-sm text-gray-500">{formatDate(bill.transaction_date)}</p>
                        </div>
                        <p className="font-semibold text-red-600">{formatCurrency(Number(bill.balance ?? bill.amount) || 0)}</p>
                      </div>
                      {billStatus && (
                        <span className="mt-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                          {billStatus}
                        </span>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </AppLayout>
  );
}
