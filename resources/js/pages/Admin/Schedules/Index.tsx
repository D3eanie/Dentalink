import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiAdmin from '@/services/ApiAdmin';
import { 
    Plus, 
    Search, 
    Filter, 
    Edit, 
    Trash2, 
    Calendar,
    Clock,
    RefreshCw,
    Download,
    User,
    CheckCircle,
    XCircle,
    X,
    AlertCircle,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

// TypeScript interfaces
interface Staff {
    id: number;
    name: string;
    email: string;
    position?: string;
}

interface Schedule {
    id: number;
    staff_id: number;
    date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
    staff?: Staff;
    formatted_date?: string;
    formatted_start_time?: string;
    formatted_end_time?: string;
    time_range?: string;
    status_color?: string;
}

interface ScheduleFilters {
    search: string;
    staff: string;
    week: string;
    is_available: string;
}

interface ScheduleFormData {
    staff_id: string;
    date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
    notes: string;
}

const initialFormData: ScheduleFormData = {
    staff_id: '',
    date: '',
    start_time: '08:00',
    end_time: '17:00',
    is_available: true,
    notes: ''
};

const breadcrumbs = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Schedules', href: '/admin/schedules' }
];

export default function AdminSchedulesPage() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
    const [formData, setFormData] = useState<ScheduleFormData>(initialFormData);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [filters, setFilters] = useState<ScheduleFilters>({
        search: '',
        staff: '',
        week: getCurrentWeekString(),
        is_available: ''
    });

    // Get current week string in YYYY-MM-DD format
    function getCurrentWeekString(): string {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        return monday.toISOString().split('T')[0];
    }

    // Format date for display
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Fetch schedules from API
    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const response = await apiAdmin.getSchedules(filters);
            setSchedules(response.data || response.schedules || []);
        } catch (error) {
            console.error('Error fetching schedules:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch staff members
    const fetchStaffMembers = async () => {
        try {
            const response = await apiAdmin.getStaff({ is_active: '1' });
            setStaffMembers(response.data || response.staff || []);
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };

    useEffect(() => {
        fetchStaffMembers();
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchSchedules();
        }, 300);
        return () => clearTimeout(debounce);
    }, [filters.search, filters.staff, filters.week, filters.is_available]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors({});

        try {
            const scheduleData = {
                staff_id: parseInt(formData.staff_id),
                date: formData.date,
                start_time: formData.start_time,
                end_time: formData.end_time,
                is_available: formData.is_available,
                notes: formData.notes
            };

            if (isEditMode && selectedSchedule) {
                await apiAdmin.updateSchedule(selectedSchedule.id, scheduleData);
            } else {
                await apiAdmin.createSchedule(scheduleData);
            }

            setIsModalOpen(false);
            setFormData(initialFormData);
            setSelectedSchedule(null);
            setIsEditMode(false);
            fetchSchedules();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                const errorMap: Record<string, string> = {};
                Object.keys(errors).forEach(key => {
                    errorMap[key] = errors[key][0];
                });
                setFormErrors(errorMap);
            } else {
                console.error(`Failed to ${isEditMode ? 'update' : 'create'} schedule:`, error);
            }
        }
    };

    // Handle schedule deletion
    const handleDelete = async (schedule: Schedule) => {
        try {
            const result = await apiAdmin.deleteSchedule(schedule.id);
            if (result !== null) {
                fetchSchedules();
            }
        } catch (error) {
            console.error('Error deleting schedule:', error);
        }
    };

    // Handle edit
    const handleEdit = (schedule: Schedule) => {
        setSelectedSchedule(schedule);
        setFormData({
            staff_id: schedule.staff_id.toString(),
            date: schedule.date,
            start_time: schedule.start_time.substring(0, 5), // HH:MM format
            end_time: schedule.end_time.substring(0, 5),
            is_available: schedule.is_available,
            notes: schedule.notes || ''
        });
        setIsEditMode(true);
        setIsModalOpen(true);
        setFormErrors({});
    };

    // Handle create new
    const handleCreateNew = () => {
        setSelectedSchedule(null);
        setFormData(initialFormData);
        setIsEditMode(false);
        setIsModalOpen(true);
        setFormErrors({});
    };

    // Handle filter change
    const handleFilterChange = (key: keyof ScheduleFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({ search: '', staff: '', week: getCurrentWeekString(), is_available: '' });
    };

    // Week navigation
    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentWeek);
        if (direction === 'prev') {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setDate(newDate.getDate() + 7);
        }
        setCurrentWeek(newDate);
        setFilters(prev => ({ ...prev, week: newDate.toISOString().split('T')[0] }));
    };

    // Toggle availability
    const toggleAvailability = async (schedule: Schedule) => {
        try {
            if (schedule.is_available) {
                await apiAdmin.makeScheduleUnavailable(schedule.id);
            } else {
                await apiAdmin.makeScheduleAvailable(schedule.id);
            }
            fetchSchedules();
        } catch (error) {
            console.error('Error toggling availability:', error);
        }
    };

    const getStatusBadge = (schedule: Schedule) => {
        if (!schedule.is_available) {
            return (
                <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    <XCircle className="w-3 h-3 mr-1" />
                    Unavailable
                </span>
            );
        }

        const scheduleDate = new Date(schedule.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (scheduleDate.toDateString() === today.toDateString()) {
            return (
                <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Today
                </span>
            );
        }

        if (scheduleDate > today) {
            return (
                <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Scheduled
                </span>
            );
        }

        return (
            <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                Past
            </span>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Schedule Management" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto px-4 py-6 sm:py-8">
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                                <Calendar className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    Schedule Management
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    Manage staff schedules and availability
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchSchedules}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2.5 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                            <button
                                onClick={handleCreateNew}
                                className="flex items-center gap-2 px-5 py-2.5 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                            >
                                <Plus className="w-4 h-4" />
                                Add Schedule
                            </button>
                        </div>
                    </div>

                    {/* Week Navigation */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => navigateWeek('prev')}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Week of {formatDate(currentWeek.toISOString().split('T')[0])}
                                </h3>
                            </div>
                            <button
                                onClick={() => navigateWeek('next')}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Filters & Table Container */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                        {/* Filters */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                <div className="flex-1 w-full">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            placeholder="Search by staff name or notes..."
                                            value={filters.search}
                                            onChange={(e) => handleFilterChange('search', e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <select
                                        value={filters.staff}
                                        onChange={(e) => handleFilterChange('staff', e.target.value)}
                                        className="w-full md:w-48 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                    >
                                        <option value="">All Staff</option>
                                        {staffMembers.map(staff => (
                                            <option key={staff.id} value={staff.id}>{staff.name}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={filters.is_available}
                                        onChange={(e) => handleFilterChange('is_available', e.target.value)}
                                        className="w-full md:w-32 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                    >
                                        <option value="">All Status</option>
                                        <option value="1">Available</option>
                                        <option value="0">Unavailable</option>
                                    </select>
                                    {(filters.search || filters.staff || filters.is_available) && (
                                        <button
                                            onClick={clearFilters}
                                            className="p-2.5 text-red-600 dark:text-red-400 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-red-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                                            title="Clear Filters"
                                        >
                                            <Filter className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Schedules Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-750">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                            Staff Member
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                            Time
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                                            Notes
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                <div className="flex justify-center">
                                                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                                                </div>
                                                <p className="mt-2">Loading schedules...</p>
                                            </td>
                                        </tr>
                                    ) : schedules.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                <div className="flex justify-center mb-2">
                                                    <Calendar className="w-8 h-8 text-gray-400" />
                                                </div>
                                                No schedules found for this week.
                                            </td>
                                        </tr>
                                    ) : (
                                        schedules.map((schedule) => (
                                            <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                                                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {schedule.staff?.name || 'Unknown Staff'}
                                                            </div>
                                                            {schedule.staff?.position && (
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {schedule.staff.position}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {formatDate(schedule.date)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                        <Clock className="w-4 h-4 mr-1" />
                                                        {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(schedule)}
                                                </td>
                                                <td className="px-6 py-4 hidden lg:table-cell">
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                                        {schedule.notes || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        <button
                                                            onClick={() => toggleAvailability(schedule)}
                                                            className={`p-2 rounded-lg transition-colors ${
                                                                schedule.is_available
                                                                    ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-gray-700'
                                                                    : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-gray-700'
                                                            }`}
                                                            title={schedule.is_available ? 'Mark Unavailable' : 'Mark Available'}
                                                        >
                                                            {schedule.is_available ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(schedule)}
                                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                            title="Edit Schedule"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(schedule)}
                                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                            title="Delete Schedule"
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
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="sticky top-0 bg-blue-600 dark:bg-blue-700 rounded-t-2xl px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold text-white">
                                {isEditMode ? 'Edit Schedule' : 'Add New Schedule'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="h-6 w-6 text-white" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Staff Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Staff Member *
                                </label>
                                <select
                                    value={formData.staff_id}
                                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                        formErrors.staff_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                >
                                    <option value="">Select Staff Member</option>
                                    {staffMembers.map(staff => (
                                        <option key={staff.id} value={staff.id}>
                                            {staff.name} {staff.position ? `(${staff.position})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.staff_id && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {formErrors.staff_id}
                                    </p>
                                )}
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                        formErrors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                />
                                {formErrors.date && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {formErrors.date}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                {/* Start Time */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Start Time *
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                            formErrors.start_time ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {formErrors.start_time && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {formErrors.start_time}
                                        </p>
                                    )}
                                </div>

                                {/* End Time */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        End Time *
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                            formErrors.end_time ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    />
                                    {formErrors.end_time && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {formErrors.end_time}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                                        formErrors.notes ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="Add any notes about this schedule..."
                                />
                                {formErrors.notes && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {formErrors.notes}
                                    </p>
                                )}
                            </div>

                            {/* Available Status */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_available}
                                        onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                                        className="h-5 w-5 text-blue-600 dark:bg-gray-600 border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Available for Appointments
                                    </span>
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-8">
                                    Uncheck to mark this schedule as unavailable (e.g., vacation, sick leave).
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setFormData(initialFormData);
                                        setFormErrors({});
                                        setSelectedSchedule(null);
                                        setIsEditMode(false);
                                    }}
                                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-gray-700 dark:text-gray-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                                >
                                    {isEditMode ? 'Update Schedule' : 'Create Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}