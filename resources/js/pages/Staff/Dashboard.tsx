import React, { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiStaff from '@/services/ApiStaff';
import ToothRecordsWidget from '@/components/sections/tooth-records-widget';
import { formatAppointmentDate, formatAppointmentTime } from '@/utils/dateTime';
import {
    LayoutGrid,
    Users,
    Calendar,
    PhilippinePeso,
    TrendingUp,
    TrendingDown,
    Activity,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Download,
    Eye,
    UserPlus,
    CalendarPlus,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

// TypeScript interfaces
interface DashboardStats {
    total_patients: number;
    total_staff: number;
    appointments_today: number;
    appointments_this_week: number;
    revenue_this_month: number;
    outstanding_balance: number;
    recent_registrations: number;
}

interface RecentAppointment {
    id: number;
    patient: {
        id: number;
        name: string;
    };
    doctor: {
        id: number;
        name: string;
    };
    service: {
        id: number;
        name: string;
    };
    appointment_date: string;
    appointment_time: string;
    status: string;
}

interface RecentActivity {
    id: number;
    performedBy: {
        id: number;
        name: string;
        role: string;
    };
    action: string;
    target_collection: string;
    target_id: number;
    timestamp: string;
    details: any;
}

interface UpcomingScheduleSummary {
    id: number;
    patient_name: string;
    service_name?: string;
    appointment_date?: string;
    appointment_time?: string;
}

interface TodaysAppointmentSummary {
    id: number;
    patient_name: string;
    service_name?: string;
    appointment_time?: string;
    status?: string;
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/staff/dashboard' }
];

export default function AdminDashboard() {
    const page = usePage();
    const initialToothRecords = (page.props.toothRecords as any[]) || [];

    const [stats, setStats] = useState<DashboardStats>({
        total_patients: 0,
        total_staff: 0,
        appointments_today: 0,
        appointments_this_week: 0,
        revenue_this_month: 0,
        outstanding_balance: 0,
        recent_registrations: 0
    });
    const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [upcomingSchedules, setUpcomingSchedules] = useState<UpcomingScheduleSummary[]>([]);
    const [todaysAppointments, setTodaysAppointments] = useState<TodaysAppointmentSummary[]>([]);
    const [toothRecords, setToothRecords] = useState<any[]>(initialToothRecords);
    const [toothRecordsStats, setToothRecordsStats] = useState({
        total: 0,
        addedToday: 0,
        uniquePatients: 0
    });

    // Calculate and set tooth records stats from initial props
    useEffect(() => {
        if (initialToothRecords.length > 0) {
            const total = initialToothRecords.length;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const addedToday = initialToothRecords.filter((r: any) => {
                const recordDate = new Date(r.date_done || r.created_at || new Date());
                recordDate.setHours(0, 0, 0, 0);
                return recordDate.getTime() === today.getTime();
            }).length;
            const uniquePatientIds = new Set(initialToothRecords.map((r: any) => r.patient_id || r.patient?.id));
            const uniquePatients = uniquePatientIds.size;

            setToothRecordsStats({ total, addedToday, uniquePatients });
        }
    }, []);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Helper function to unwrap response data
    const unwrapData = (response: any, key: string) => {
        if (!response) return null;
        if (response[key]) return response[key];
        if (response.data?.[key]) return response.data[key];
        return response.data || response;
    };

    const buildUpcomingSchedules = (appointments: any[]) => {
        const now = new Date();
        const todayString = now.toISOString().split('T')[0];

        return appointments
            .filter((appointment: any) => {
                if (!appointment?.appointment_date || !appointment?.appointment_time) {
                    return false;
                }

                const dateOnly = appointment.appointment_date.split('T')[0];
                const cleanTime = appointment.appointment_time.length > 5
                    ? appointment.appointment_time.slice(0, 5)
                    : appointment.appointment_time;
                const appointmentDateTime = new Date(`${dateOnly}T${cleanTime}:00`);

                if (Number.isNaN(appointmentDateTime.getTime())) {
                    return false;
                }

                const isToday = dateOnly === todayString;
                const isConfirmed = appointment.status === 'confirmed';

                return isToday && isConfirmed && appointmentDateTime >= now;
            })
            .sort((a: any, b: any) => {
                const aDateOnly = a.appointment_date.split('T')[0];
                const bDateOnly = b.appointment_date.split('T')[0];
                const aTime = a.appointment_time.length > 5 ? a.appointment_time.slice(0, 5) : a.appointment_time;
                const bTime = b.appointment_time.length > 5 ? b.appointment_time.slice(0, 5) : b.appointment_time;
                const aDateTime = new Date(`${aDateOnly}T${aTime}:00`);
                const bDateTime = new Date(`${bDateOnly}T${bTime}:00`);
                return aDateTime.getTime() - bDateTime.getTime();
            })
            .slice(0, 5)
            .map((appointment: any) => ({
                id: appointment.id,
                patient_name: appointment.patient?.name || 'Unknown Patient',
                service_name: appointment.service?.name,
                appointment_date: appointment.appointment_date,
                appointment_time: appointment.appointment_time,
            }));
    };

    // Fetch dashboard data
    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Try to get dashboard data from API
            let dashboardResponse;
            try {
                dashboardResponse = await apiStaff.getDashboardData();
            } catch (dashboardError) {
                console.warn('Dashboard API failed, fetching individual components:', dashboardError);
                // Fallback: fetch individual components
                dashboardResponse = await fetchFallbackData();
            }

            console.log('Dashboard response:', dashboardResponse);

            // Extract stats
            const statsData = unwrapData(dashboardResponse, 'stats');
            if (statsData) {
                setStats({
                    total_patients: Number(statsData.total_patients || 0),
                    total_staff: Number(statsData.total_staff || 0),
                    appointments_today: Number(statsData.appointments_today || 0),
                    appointments_this_week: Number(statsData.appointments_this_week || 0),
                    revenue_this_month: Number(statsData.revenue_this_month || 0),
                    outstanding_balance: Number(statsData.outstanding_balance || 0),
                    recent_registrations: Number(statsData.recent_registrations || 0)
                });
            }

            // Extract recent appointments
            const appointmentsData = unwrapData(dashboardResponse, 'recentAppointments');
            if (Array.isArray(appointmentsData)) {
                setRecentAppointments(appointmentsData.slice(0, 10));
                setUpcomingSchedules(buildUpcomingSchedules(appointmentsData));
            }

            // Extract recent activities
            const activitiesData = unwrapData(dashboardResponse, 'recentActivities');
            if (Array.isArray(activitiesData)) {
                setRecentActivities(activitiesData.slice(0, 10));
            }

            const requestsData = unwrapData(dashboardResponse, 'appointmentRequests');
            if (Array.isArray(requestsData) && requestsData.length > 0 && !Array.isArray(appointmentsData)) {
                setUpcomingSchedules(requestsData);
            }

            const todaysData = unwrapData(dashboardResponse, 'todaysAppointments');
            if (Array.isArray(todaysData)) {
                setTodaysAppointments(todaysData);
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            // Try fallback approach
            await fetchFallbackData();
        } finally {
            setLoading(false);
        }
    };

    // Fallback: fetch data from individual endpoints
    const fetchFallbackData = async () => {
        try {
            console.log('[Dashboard] Starting fetchFallbackData...');
            console.log('[Dashboard] API Staff instance:', apiStaff);
            console.log('[Dashboard] Attempting to call apiStaff.getToothRecords()...');
            const [appointmentsRes, toothRecordsRes] = await Promise.allSettled([
                apiStaff.getAppointments({
                    date: new Date().toISOString().split('T')[0],
                    limit: 10
                }),
                apiStaff.getToothRecords({ per_page: 100 })
            ]);

            console.log('[Dashboard] Promise.allSettled results:');
            console.log('[Dashboard] appointmentsRes:', appointmentsRes);
            console.log('[Dashboard] toothRecordsRes:', toothRecordsRes);

            // Staff dashboard doesn't need user stats

            // Process appointments data
            if (appointmentsRes.status === 'fulfilled') {
                const appointmentData = appointmentsRes.value;
                const appointments = Array.isArray(appointmentData?.data) ? appointmentData.data :
                                    Array.isArray(appointmentData?.appointments) ? appointmentData.appointments :
                                    Array.isArray(appointmentData) ? appointmentData : [];

                setRecentAppointments(appointments.slice(0, 10));
                setStats(prev => ({
                    ...prev,
                    appointments_today: appointments.length
                }));

                setUpcomingSchedules(buildUpcomingSchedules(appointments));

                setTodaysAppointments(
                    appointments.map((appointment: any) => ({
                        id: appointment.id,
                        patient_name: appointment.patient?.name || 'Unknown Patient',
                        service_name: appointment.service?.name,
                        appointment_time: appointment.appointment_time,
                        status: appointment.status,
                    }))
                );
            }

            // Process tooth records data
            if (toothRecordsRes.status === 'fulfilled') {
                const toothResponse = toothRecordsRes.value;
                console.log('[Dashboard] toothRecordsRes FULFILLED');
                console.log('[Dashboard] toothResponse:', toothResponse);
                console.log('[Dashboard] toothResponse.data:', toothResponse?.data);
                console.log('[Dashboard] Is toothResponse.data an array?', Array.isArray(toothResponse?.data));
                console.log('[Dashboard] toothResponse.data.data:', toothResponse?.data?.data);
                console.log('[Dashboard] Is toothResponse.data.data an array?', Array.isArray(toothResponse?.data?.data));

                // handleResponse returns response.data, which contains { success, data: [...], pagination }
                // So we need to check the structure carefully
                let records: any[] = [];

                if (toothResponse?.data && Array.isArray(toothResponse.data)) {
                    // If data is directly an array (the tooth records)
                    records = toothResponse.data;
                    console.log('[Dashboard] Found records in toothResponse.data array');
                } else if (toothResponse?.data && typeof toothResponse.data === 'object' && toothResponse.data?.data && Array.isArray(toothResponse.data.data)) {
                    // If nested: { data: { data: [...] } }
                    records = toothResponse.data.data;
                    console.log('[Dashboard] Found records in toothResponse.data.data array');
                } else if (Array.isArray(toothResponse)) {
                    // If response is directly an array
                    records = toothResponse;
                    console.log('[Dashboard] toothResponse is directly an array');
                }

                console.log('[Dashboard] Final records array:', records);
                console.log('[Dashboard] records.length:', records.length);

                if (!Array.isArray(records)) {
                    console.error('[Dashboard] Records is not an array:', typeof records, records);
                    records = [];
                }

                // Ensure records have patient data
                records = records.map((r: any) => ({
                    ...r,
                    patient: r.patient || { id: r.patient_id, name: 'Unknown' }
                }));

                setToothRecords(records.slice(0, 5));

                // Calculate tooth records stats
                const total = records.length;

                // Records added today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const addedToday = records.filter((r: any) => {
                    const recordDate = new Date(r.date_done || r.created_at || new Date());
                    recordDate.setHours(0, 0, 0, 0);
                    return recordDate.getTime() === today.getTime();
                }).length;

                // Unique patients
                const uniquePatientIds = new Set(records.map((r: any) => r.patient_id || r.patient?.id));
                const uniquePatients = uniquePatientIds.size;

                console.log('[Dashboard] Stats - total:', total, 'addedToday:', addedToday, 'uniquePatients:', uniquePatients);

                setToothRecordsStats({
                    total,
                    addedToday,
                    uniquePatients
                });
            } else if (toothRecordsRes.status === 'rejected') {
                console.error('[Dashboard] toothRecordsRes REJECTED');
                console.error('[Dashboard] Error reason:', toothRecordsRes.reason);
                console.error('[Dashboard] Error message:', toothRecordsRes.reason?.message);
                console.error('[Dashboard] Error response:', toothRecordsRes.reason?.response);
                console.error('[Dashboard] Error response status:', toothRecordsRes.reason?.response?.status);
                console.error('[Dashboard] Error response data:', toothRecordsRes.reason?.response?.data);
                setToothRecordsStats({ total: 0, addedToday: 0, uniquePatients: 0 });
                setToothRecords([]);
            }

            // Staff dashboard doesn't need financial stats

            return { stats, recentAppointments, recentActivities };
        } catch (error) {
            console.error('Fallback data fetch error:', error);
            return {};
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchDashboardData();
        setRefreshing(false);
    };

    // Helper functions
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            scheduled: 'bg-blue-100 text-blue-800',
            confirmed: 'bg-green-100 text-green-800',
            not_available: 'bg-gray-100 text-gray-800',
            completed: 'bg-gray-100 text-gray-800',
            cancelled: 'bg-red-100 text-red-800',
            no_show: 'bg-orange-100 text-orange-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getActionIcon = (action: string) => {
        const icons: Record<string, JSX.Element> = {
            create: <UserPlus className="w-4 h-4 text-green-600" />,
            update: <RefreshCw className="w-4 h-4 text-blue-600" />,
            delete: <XCircle className="w-4 h-4 text-red-600" />,
            complete: <CheckCircle className="w-4 h-4 text-green-600" />,
            cancel: <XCircle className="w-4 h-4 text-orange-600" />
        };
        return icons[action] || <Activity className="w-4 h-4 text-gray-600" />;
    };

    return (
        <AppLayout
            pageTitle="Staff Dashboard"
            breadcrumbs={breadcrumbs}
        >
        <div className="flex flex-col gap-6 p-6">
            <div className="space-y-">
                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link
                            href="/staff/patients"
                            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Users className="w-8 h-8 text-blue-600" />
                            <div>
                                <p className="font-medium text-gray-900">View Patients</p>
                                <p className="text-sm text-gray-600">Manage patient records</p>
                            </div>
                        </Link>

                        <Link
                            href="/staff/appointments"
                            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Calendar className="w-8 h-8 text-green-600" />
                            <div>
                                <p className="font-medium text-gray-900">My Appointments</p>
                                <p className="text-sm text-gray-600">View appointments</p>
                            </div>
                        </Link>

                        <Link
                            href="/staff/schedule"
                            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Clock className="w-8 h-8 text-purple-600" />
                            <div>
                                <p className="font-medium text-gray-900">My Schedule</p>
                                <p className="text-sm text-gray-600">Set availability</p>
                            </div>
                        </Link>

                        <Link
                            href="/staff/financial"
                            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <PhilippinePeso className="w-8 h-8 text-orange-600" />
                            <div>
                                <p className="font-medium text-gray-900">Financial</p>
                                <p className="text-sm text-gray-600">View billing</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Tooth Records Widget removed per request */}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Upcoming Schedules</h2>
                            <span className="text-sm text-gray-500">{upcomingSchedules.length}</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {upcomingSchedules.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No upcoming schedules.</div>
                            ) : (
                                upcomingSchedules.map(schedule => (
                                    <div key={schedule.id} className="p-4">
                                        <p className="text-sm font-semibold text-gray-900">{schedule.patient_name}</p>
                                        <p className="text-xs text-gray-500">{schedule.service_name || 'General Consultation'}</p>
                                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                            <span>
                                                <Calendar className="w-3 h-3 inline mr-1" />
                                                {schedule.appointment_date ? formatAppointmentDate(schedule.appointment_date) : 'TBD'}
                                            </span>
                                            <span>
                                                <Clock className="w-3 h-3 inline mr-1" />
                                                {schedule.appointment_time ? formatAppointmentTime(schedule.appointment_time) : '--'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Today's Appointments</h2>
                            <span className="text-sm text-gray-500">{todaysAppointments.length}</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {todaysAppointments.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No bookings yet.</div>
                            ) : (
                                todaysAppointments.map(appointment => (
                                    <div key={appointment.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{appointment.patient_name}</p>
                                            <p className="text-xs text-gray-500">
                                                {appointment.service_name || 'General Consultation'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-900">{appointment.appointment_time ? formatAppointmentTime(appointment.appointment_time) : '--'}</p>
                                            <span className={`text-xs font-medium capitalize ${
                                                appointment.status === 'confirmed'
                                                    ? 'text-emerald-600'
                                                    : appointment.status === 'scheduled'
                                                        ? 'text-blue-600'
                                                        : 'text-gray-500'
                                            }`}>
                                                {appointment.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
        </AppLayout>
    );
}
