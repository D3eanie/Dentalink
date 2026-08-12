import React, { useState, useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiClient from '@/services/ApiPatient';
import {
    Bell,
    Calendar,
    FileText,
    Heart,
    AlertCircle,
    CheckCircle,
    Info,
    X,
    Filter,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Check,
    Eye
} from 'lucide-react';

// ==================== TYPES ====================
interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'treatment' | 'medical_record';
    read: boolean;
    is_read: boolean; 
    created_at: string;
    data?: Record<string, any>;
}

interface Filters {
    type: string;
    read: string;
    page: number;
    per_page: number;
}

interface PaginationMeta {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
}

interface NotificationsResponse {
    data: Notification[];
    meta: PaginationMeta;
    unread_count: number;
}

// ==================== BREADCRUMBS ====================
const breadcrumbs = [
    { title: 'Patient Portal', href: '/patient/dashboard' },
    { title: 'Notifications', href: '/notifications' }
];

// ==================== MAIN COMPONENT ====================
export default function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);

    const [filters, setFilters] = useState<Filters>({
        type: '',
        read: '',
        page: 1,
        per_page: 15
    });

    const [pagination, setPagination] = useState<PaginationMeta>({
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0
    });

    const [unreadCount, setUnreadCount] = useState(0);

    /**
     * FIX: Removed 'pagination' from dependency array to break the infinite loop.
     * `setPagination` updates state based on the *response*, so making it a dependency
     * causes the function to re-run after every successful fetch, creating the loop.
     * The `filters` state is the correct dependency.
     */
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);

        console.log('Fetching notifications with filters:', filters);

        try {
            const rawResponse: any = await apiClient.getMyNotifications(filters);

            console.log('API Response:', rawResponse);

            if (rawResponse && Array.isArray(rawResponse)) {
                // *** FRONTEND FIX FOR RAW ARRAY RESPONSE (AS SEEN IN LOGS) ***
                const mappedData: Notification[] = rawResponse.map(n => ({
                    ...n,
                    read: n.is_read // Map 'is_read' from API data to expected 'read' property
                }));

                const total = mappedData.length;
                const unread = mappedData.filter(n => !n.read).length;

                setNotifications(mappedData);
                setUnreadCount(unread);
                
                // Set default/placeholder pagination for raw array
                setPagination({
                    current_page: 1,
                    per_page: 15, // Use filter default
                    total: total,
                    last_page: Math.ceil(total / filters.per_page) || 1, 
                    from: 1,
                    to: total
                });

            } else if (rawResponse && rawResponse.data) {
                // *** EXPECTED API STRUCTURE HANDLING ***
                setNotifications(rawResponse.data.map((n: any) => ({...n, read: n.read ?? n.is_read})));
                setPagination(rawResponse.meta || pagination);
                setUnreadCount(rawResponse.unread_count || 0);
            } else {
                setNotifications([]);
                setUnreadCount(0);
                setPagination(prev => ({...prev, total: 0, from: 0, to: 0, last_page: 1}));
            }

        } catch (error: any) {
            console.error('Error fetching notifications:', error);
            setError(error.message || 'Failed to fetch notifications');
            apiClient.showErrorToast('Failed to fetch notifications.');
            setNotifications([]);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    }, [filters]); // DEPENDENCY FIX: ONLY include 'filters'

    /**
     * FIX: This useEffect now correctly depends only on the memoized fetchNotifications 
     * function, which only changes when 'filters' change, preventing the infinite loop.
     */
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);


    // --- Other Handlers (Simplified for brevity but kept in original) ---
    const handleRefresh = async () => {
        setRefreshing(true);
        if (filters.page !== 1) {
            setFilters(prev => ({ ...prev, page: 1 }));
        } else {
            await fetchNotifications();
        }
        setRefreshing(false);
    };

    const handleClearFilters = () => {
        setFilters({
            type: '',
            read: '',
            page: 1,
            per_page: 15
        });
    };

    const handleMarkAsRead = async (notificationId: number) => {
        try {
            await apiClient.markNotificationAsRead(notificationId);
            setNotifications(notifications.map(n => 
                n.id === notificationId ? { ...n, read: true } : n
            ));
            setUnreadCount(prevCount => Math.max(0, prevCount - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
            apiClient.showErrorToast('Failed to mark as read.');
        }
    };

    const handleViewNotification = async (notification: Notification) => {
        setSelectedNotification(notification);
        setShowViewModal(true);
        if (!notification.read) {
            await handleMarkAsRead(notification.id);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await apiClient.markAllNotificationsAsRead();
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            apiClient.showSuccessToast('All notifications marked as read.');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            apiClient.showErrorToast('Failed to mark all as read.');
        }
    };

    const handleDeleteNotification = async (notificationId: number) => {
        const confirmed = await apiClient.confirmAction(
            'Delete Notification',
            'Are you sure you want to delete this notification?',
            'Yes, delete'
        );

        if (!confirmed) return;

        try {
            await apiClient.deleteNotification(notificationId);
            const deletedNotification = notifications.find(n => n.id === notificationId);
            setNotifications(notifications.filter(n => n.id !== notificationId));
            
            if (deletedNotification && !deletedNotification.read) {
                setUnreadCount(prevCount => Math.max(0, prevCount - 1));
            }
            apiClient.showSuccessToast('Notification deleted.');
        } catch (error) {
            console.error('Error deleting notification:', error);
            apiClient.showErrorToast('Failed to delete notification.');
        }
    };

    // --- Helper Functions (formatDate, getNotificationIcon, getNotificationColor) ---
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-6 h-6 text-green-600" />;
            case 'warning':
                return <AlertCircle className="w-6 h-6 text-yellow-600" />;
            case 'error':
                return <AlertCircle className="w-6 h-6 text-red-600" />;
            case 'appointment':
                return <Calendar className="w-6 h-6 text-blue-600" />;
            case 'treatment':
                return <Heart className="w-6 h-6 text-purple-600" />;
            case 'medical_record':
                return <FileText className="w-6 h-6 text-indigo-600" />;
            default:
                return <Info className="w-6 h-6 text-gray-600" />;
        }
    };

    const getNotificationColor = (type: string) => {
        const colors: Record<string, string> = {
            success: 'bg-green-100 border-green-200',
            warning: 'bg-yellow-100 border-yellow-200',
            error: 'bg-red-100 border-red-200',
            appointment: 'bg-blue-100 border-blue-200',
            treatment: 'bg-purple-100 border-purple-200',
            medical_record: 'bg-indigo-100 border-indigo-200',
            info: 'bg-gray-100 border-gray-200'
        };
        return colors[type] || 'bg-gray-100 border-gray-200';
    };

    // --- JSX RENDER ---
    return (
        <AppLayout
            title="Notifications"
            breadcrumbs={breadcrumbs}
            actions={
                unreadCount > 0 ? (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Mark All as Read
                    </button>
                ) : null
            }
        >
            <Head title="Notifications" />

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-red-800">Error Loading Notifications</h3>
                            <p className="text-sm text-red-700 mt-1">{error}</p>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-600 hover:text-red-800"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Banner */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Bell className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Your Notifications
                            </h3>
                            <p className="text-sm text-gray-600">
                                {unreadCount > 0 ? (
                                    <>
                                        You have <span className="font-semibold text-blue-600">{unreadCount}</span> unread notification{unreadCount !== 1 ? 's' : ''}
                                    </>
                                ) : (
                                    'You\'re all caught up!'
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={refreshing || loading}
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing || loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-4 border-b border-gray-200">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                    </button>
                </div>

                {showFilters && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Type
                                </label>
                                <select
                                    value={filters.type}
                                    onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Types</option>
                                    <option value="appointment">Appointments</option>
                                    <option value="treatment">Treatment</option>
                                    <option value="medical_record">Medical Records</option>
                                    <option value="success">Success</option>
                                    <option value="warning">Warning</option>
                                    <option value="error">Error</option>
                                    <option value="info">Info</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <select
                                    value={filters.read}
                                    onChange={(e) => setFilters({ ...filters, read: e.target.value, page: 1 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Notifications</option>
                                    <option value="unread">Unread Only</option>
                                    <option value="read">Read Only</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <button
                                onClick={handleClearFilters}
                                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Notifications List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading notifications...</p>
                    </div>
                ) : notifications.length > 0 ? (
                    <>
                        <div className="divide-y divide-gray-200">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-5 hover:bg-gray-50 transition-colors ${
                                        !notification.read ? 'bg-blue-50' : ''
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className={`flex-shrink-0 p-2 rounded-lg border ${getNotificationColor(notification.type)}`}>
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h3 className={`text-sm font-semibold ${
                                                        !notification.read ? 'text-gray-900' : 'text-gray-700'
                                                    }`}>
                                                        {notification.title}
                                                        {!notification.read && (
                                                            <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                                                        )}
                                                    </h3>
                                                </div>
                                                <p className="text-sm text-gray-600 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    {formatDate(notification.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => handleViewNotification(notification)}
                                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="View details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {!notification.read && (
                                                <button
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteNotification(notification.id)}
                                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination.total > 0 && (
                            <div className="px-6 py-4 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Showing {pagination.from} to {pagination.to} of {pagination.total} notifications
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                                            disabled={pagination.current_page === 1}
                                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <span className="text-sm text-gray-600">
                                            Page {pagination.current_page} of {pagination.last_page}
                                        </span>
                                        <button
                                            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                                            disabled={pagination.current_page === pagination.last_page}
                                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-12 text-center">
                        <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No Notifications
                        </h3>
                        <p className="text-gray-600">
                            You don't have any notifications at the moment.
                        </p>
                    </div>
                )}
            </div>

            {/* View Notification Modal */}
            {showViewModal && selectedNotification && (
                <div className="fixed inset-0 bg-white/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg border ${getNotificationColor(selectedNotification.type)}`}>
                                    {getNotificationIcon(selectedNotification.type)}
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {selectedNotification.title}
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Message
                                </label>
                                <p className="text-base text-gray-900 whitespace-pre-wrap">
                                    {selectedNotification.message}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Received
                                </label>
                                <p className="text-base text-gray-900">
                                    {new Date(selectedNotification.created_at).toLocaleString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            {!selectedNotification.read && (
                                <button
                                    onClick={() => {
                                        handleMarkAsRead(selectedNotification.id);
                                        setShowViewModal(false);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Mark as Read
                                </button>
                            )}
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}