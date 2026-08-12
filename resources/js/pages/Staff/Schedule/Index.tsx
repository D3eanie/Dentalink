import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiStaff from '@/services/ApiStaff';
import {
    Clock,
    Calendar,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    XCircle,
    AlertCircle,
    Plus,
    Edit,
    Trash2,
    CalendarPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Swal from 'sweetalert2';

interface Schedule {
    id: number;
    staff_id: number;
    date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/staff/dashboard' },
    { title: 'My Schedule', href: '/staff/schedule' }
];

export default function StaffSchedulesPage() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWeek, setSelectedWeek] = useState(new Date());
    const [showDialog, setShowDialog] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [formData, setFormData] = useState({
        date: '',
        start_time: '',
        end_time: '',
        is_available: true,
        notes: ''
    });

    useEffect(() => {
        fetchSchedules();
    }, [selectedWeek]);

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const weekStart = getWeekStart(selectedWeek);
            const weekStartStr = formatDateToLocalString(weekStart);
            const response = await apiStaff.getSchedules({
                week: weekStartStr
            });
            const schedulesData = response?.data || response?.schedules || response || [];
            // Filter by current user (staff_id will be set by backend)
            const schedulesArray = Array.isArray(schedulesData) ? schedulesData : [];
            setSchedules(schedulesArray);
            
            // Debug logging (can be removed later)
            if (schedulesArray.length > 0) {
                console.log('Fetched schedules:', schedulesArray);
                console.log('Week start:', weekStartStr);
                schedulesArray.forEach((s: Schedule) => {
                    console.log(`Schedule date: ${s.date}, normalized: ${normalizeDateString(s.date)}`);
                });
            }
        } catch (error) {
            console.error('Error fetching schedules:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load schedules. Please try again.',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const getWeekStart = (date: Date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0); // Set to midnight local time
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0, 0, 0, 0); // Ensure midnight local time
        return weekStart;
    };

    const getWeekEnd = (date: Date) => {
        const start = getWeekStart(date);
        return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    };

    const getDaysInWeek = () => {
        const start = getWeekStart(selectedWeek);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            // Set to midnight local time to avoid timezone issues
            day.setHours(0, 0, 0, 0);
            days.push(day);
        }
        return days;
    };

    const handleWeekChange = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedWeek);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedWeek(newDate);
    };

    const formatTime = (time: string) => {
        if (!time) return '';
        // Handle both datetime and time formats
        const timeStr = time.includes('T') ? time.split('T')[1].split('.')[0] : time;
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes || '0'));
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    const formatDateRange = () => {
        const start = getWeekStart(selectedWeek);
        const end = getWeekEnd(selectedWeek);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const formatDateToLocalString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const normalizeDateString = (date: string | null | undefined | any): string | null => {
        if (!date) return null;
        
        // Handle date objects (from Laravel Carbon serialization)
        if (typeof date === 'object' && date !== null) {
            // If it's an object with date properties (Laravel sometimes returns date as object)
            if (date.date) {
                return normalizeDateString(date.date);
            }
            // Try to extract date from object
            if (date.year && date.month && date.day) {
                const year = String(date.year);
                const month = String(date.month).padStart(2, '0');
                const day = String(date.day).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            // If object has toString or valueOf, try that
            if (typeof date.toString === 'function') {
                return normalizeDateString(date.toString());
            }
        }
        
        const dateStr = String(date);
        
        // Handle ISO format with time (e.g., "2024-01-15T00:00:00.000000Z" or "2024-01-15T00:00:00")
        if (dateStr.includes('T')) {
            return dateStr.split('T')[0];
        }
        
        // Handle date-only format (e.g., "2024-01-15")
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
        }
        
        // Try to parse and format if it's in a different format
        try {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
                return formatDateToLocalString(parsed);
            }
        } catch (e) {
            // Ignore parsing errors
        }
        
        return null;
    };

    const getScheduleForDate = (date: Date) => {
        const dateStr = formatDateToLocalString(date);
        const found = schedules.find(s => {
            const scheduleDate = normalizeDateString(s.date);
            const matches = scheduleDate === dateStr;
            // Debug logging (can be removed later)
            if (matches) {
                console.log(`Match found: ${dateStr} === ${scheduleDate}`, s);
            }
            return matches;
        });
        
        // Debug logging if no match found (can be removed later)
        if (!found && schedules.length > 0) {
            console.log(`No schedule found for date: ${dateStr}`);
            console.log('Available schedule dates:', schedules.map(s => ({ original: s.date, normalized: normalizeDateString(s.date) })));
        }
        
        return found;
    };

    const openDialog = (date?: Date, schedule?: Schedule) => {
        if (schedule) {
            // Editing existing schedule
            setEditingSchedule(schedule);
            const normalizedDate = normalizeDateString(schedule.date) || '';
            const startTimeStr = String(schedule.start_time || '');
            const endTimeStr = String(schedule.end_time || '');
            setFormData({
                date: normalizedDate,
                start_time: startTimeStr.includes('T') 
                    ? startTimeStr.split('T')[1].substring(0, 5)
                    : startTimeStr.substring(0, 5),
                end_time: endTimeStr.includes('T')
                    ? endTimeStr.split('T')[1].substring(0, 5)
                    : endTimeStr.substring(0, 5),
                is_available: schedule.is_available,
                notes: schedule.notes || ''
            });
        } else if (date) {
            // Creating new schedule for specific date
            setEditingSchedule(null);
            setFormData({
                date: formatDateToLocalString(date),
                start_time: '09:00',
                end_time: '17:00',
                is_available: true,
                notes: ''
            });
        } else {
            // Creating new schedule (no date specified)
            setEditingSchedule(null);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setFormData({
                date: formatDateToLocalString(tomorrow),
                start_time: '09:00',
                end_time: '17:00',
                is_available: true,
                notes: ''
            });
        }
        setShowDialog(true);
    };

    const closeDialog = () => {
        setShowDialog(false);
        setEditingSchedule(null);
        setFormData({
            date: '',
            start_time: '',
            end_time: '',
            is_available: true,
            notes: ''
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSchedule) {
                // Update existing schedule
                await apiStaff.updateSchedule(editingSchedule.id, formData);
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Schedule updated successfully.',
                    confirmButtonColor: '#10B981',
                    timer: 2000
                });
            } else {
                // Create new schedule
                await apiStaff.createSchedule(formData);
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Schedule created successfully.',
                    confirmButtonColor: '#10B981',
                    timer: 2000
                });
            }
            closeDialog();
            fetchSchedules();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to save schedule.';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonColor: '#EF4444'
            });
        }
    };

    const handleDelete = async (schedule: Schedule) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Delete Schedule',
            text: 'Are you sure you want to delete this schedule?',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                await apiStaff.deleteSchedule(schedule.id);
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Schedule has been deleted successfully.',
                    confirmButtonColor: '#10B981',
                    timer: 2000
                });
                fetchSchedules();
            } catch (error: any) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.message || 'Failed to delete schedule.',
                    confirmButtonColor: '#EF4444'
                });
            }
        }
    };

    const toggleAvailability = async (schedule: Schedule) => {
        try {
            if (schedule.is_available) {
                await apiStaff.makeScheduleUnavailable(schedule.id);
            } else {
                await apiStaff.makeScheduleAvailable(schedule.id);
            }
            fetchSchedules();
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to update availability.',
                confirmButtonColor: '#EF4444'
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Schedule" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto px-4 py-6 sm:py-8">
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                                <Clock className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    My Schedule
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    Manage your availability and working hours
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => openDialog()}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Set Availability</span>
                            </Button>
                            <Button
                                onClick={fetchSchedules}
                                disabled={loading}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>
                        </div>
                    </div>

                    {/* Week Navigator */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                        <div className="flex items-center justify-between">
                            <Button
                                onClick={() => handleWeekChange('prev')}
                                variant="ghost"
                                size="icon"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatDateRange()}
                                </h2>
                            </div>
                            <Button
                                onClick={() => handleWeekChange('next')}
                                variant="ghost"
                                size="icon"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Schedule Grid */}
                    {loading ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">Loading schedule...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                            {getDaysInWeek().map((day) => {
                                const schedule = getScheduleForDate(day);
                                const isToday = day.toDateString() === new Date().toDateString();
                                const isPast = day < new Date() && !isToday;

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 transition-all ${
                                            schedule?.is_available
                                                ? 'border-green-200 dark:border-green-900/30'
                                                : schedule
                                                ? 'border-red-200 dark:border-red-900/30'
                                                : 'border-gray-200 dark:border-gray-700'
                                        } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                                    >
                                        <div
                                            className={`p-4 rounded-t-xl ${
                                                schedule?.is_available
                                                    ? 'bg-green-50 dark:bg-green-900/20'
                                                    : schedule
                                                    ? 'bg-red-50 dark:bg-red-900/20'
                                                    : 'bg-gray-50 dark:bg-gray-700/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                                </h3>
                                                {schedule?.is_available ? (
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                ) : schedule ? (
                                                    <XCircle className="w-4 h-4 text-red-600" />
                                                ) : null}
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </p>
                                            {isToday && (
                                                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded">
                                                    Today
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-4">
                                            {schedule ? (
                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <Clock className="w-3 h-3 text-gray-400" />
                                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                                Hours
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                                        </p>
                                                    </div>

                                                    {schedule.notes && (
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                                            {schedule.notes}
                                                        </p>
                                                    )}

                                                    {!isPast && (
                                                        <div className="flex gap-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                            <Button
                                                                onClick={() => openDialog(day, schedule)}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 text-xs"
                                                            >
                                                                <Edit className="w-3 h-3 mr-1" />
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleDelete(schedule)}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="w-3 h-3 mr-1" />
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4">
                                                    <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                        Not scheduled
                                                    </p>
                                                    {!isPast && (
                                                        <Button
                                                            onClick={() => openDialog(day)}
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 px-2 text-xs"
                                                        >
                                                            <CalendarPlus className="w-3 h-3 mr-1" />
                                                            Set Hours
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Dialog for Creating/Editing Schedule */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingSchedule ? 'Edit Schedule' : 'Set Availability'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingSchedule
                                ? 'Update your working hours and availability for this day.'
                                : 'Set your working hours and availability for a specific day.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="start_time">Start Time</Label>
                                <Input
                                    id="start_time"
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="end_time">End Time</Label>
                                <Input
                                    id="end_time"
                                    type="time"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Input
                                id="notes"
                                type="text"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="e.g., Break time: 12:00-13:00"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_available"
                                checked={formData.is_available}
                                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <Label htmlFor="is_available" className="cursor-pointer">
                                Available for appointments
                            </Label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeDialog}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
