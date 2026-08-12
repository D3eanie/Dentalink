import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiStaff from '@/services/ApiStaff';
import {
    Bell,
    Calendar,
    Check,
    RefreshCw,
    AlertCircle,
    Info,
    X,
} from 'lucide-react';

interface NotificationItem {
    id: number;
    title: string;
    message: string;
    type?: string;
    created_at: string;
    is_read?: boolean;
    read?: boolean;
}

type FilterOption = 'all' | 'unread' | 'read';

const breadcrumbs = [
    { title: 'Staff Portal', href: '/staff/dashboard' },
    { title: 'Notifications', href: '/staff/notifications' },
];

const typeIcon = (type?: string) => {
    switch (type) {
        case 'appointment':
            return <Calendar className="w-5 h-5 text-blue-600" />;
        case 'billing':
        case 'financial':
            return <Bell className="w-5 h-5 text-emerald-600" />;
        case 'system':
            return <AlertCircle className="w-5 h-5 text-amber-600" />;
        default:
            return <Info className="w-5 h-5 text-slate-500" />;
    }
};

const formatRelative = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return 'Just now';
    }
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
};

export default function StaffNotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterOption>('all');
    const [unreadCount, setUnreadCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupDismissed, setPopupDismissed] = useState(false);

    const normalize = (payload: any): NotificationItem[] => {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.data)) return payload.data;
        return [];
    };

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiStaff.getNotifications();
            const items = normalize(response).map((notification) => ({
                ...notification,
                is_read: notification.is_read ?? notification.read ?? false,
            }));

            setNotifications(items);
            setUnreadCount(items.filter((n) => !n.is_read).length);
        } catch (err: any) {
            const message = err?.message || 'Unable to load notifications.';
            setError(message);
            apiStaff.showErrorToast(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const unreadNotifications = useMemo(
        () => notifications.filter((notification) => !notification.is_read),
        [notifications],
    );

    const filteredNotifications = useMemo(() => {
        if (filter === 'all') return notifications;
        return notifications.filter((notification) =>
            filter === 'unread' ? !notification.is_read : notification.is_read,
        );
    }, [notifications, filter]);

    useEffect(() => {
        if (unreadNotifications.length > 0 && !popupDismissed) {
            setShowPopup(true);
        } else {
            setShowPopup(false);
        }
    }, [unreadNotifications.length, popupDismissed]);

    const markAsRead = async (id: number) => {
        try {
            await apiStaff.markNotificationAsRead(id);
            setNotifications((prev) =>
                prev.map((notification) =>
                    notification.id === id ? { ...notification, is_read: true } : notification,
                ),
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err: any) {
            const message = err?.message || 'Failed to mark notification as read.';
            apiStaff.showErrorToast(message);
        }
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;
        try {
            await apiStaff.markAllNotificationsAsRead();
            setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
            setUnreadCount(0);
            apiStaff.showSuccessToast('All notifications marked as read.');
            setShowPopup(false);
        } catch (err: any) {
            const message = err?.message || 'Failed to mark notifications as read.';
            apiStaff.showErrorToast(message);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    };

    const handleClosePopup = () => {
        setShowPopup(false);
        setPopupDismissed(true);
    };

    return (
        <AppLayout
            title="Notifications"
            breadcrumbs={breadcrumbs}
            actions={
                unreadCount > 0 ? (
                    <button
                        onClick={markAllAsRead}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 transition"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Mark all as read
                    </button>
                ) : null
            }
        >
            <Head title="Staff Notifications" />

            {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1">{error}</div>
                </div>
            )}

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-50 p-3">
                            <Bell className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Inbox</p>
                            <p className="text-lg font-semibold text-slate-900">
                                {unreadCount > 0
                                    ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                                    : 'You are all caught up'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={loading || refreshing}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-sm font-medium text-slate-600">Filter:</span>
                {(['all', 'unread', 'read'] as FilterOption[]).map((option) => (
                    <button
                        key={option}
                        onClick={() => setFilter(option)}
                        className={`rounded-full px-4 py-1.5 text-sm capitalize transition ${
                            filter === option
                                ? 'bg-blue-600 text-white shadow'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {option}
                    </button>
                ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="p-10 text-center text-slate-500">
                        <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />
                        Loading notifications...
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="p-10 text-center text-slate-500">
                        <Bell className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                        No notifications for this filter.
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {filteredNotifications.map((notification) => (
                            <li
                                key={notification.id}
                                className={`flex items-start gap-4 px-6 py-5 transition ${
                                    notification.is_read ? 'bg-white' : 'bg-blue-50/60'
                                }`}
                            >
                                <div className="rounded-2xl bg-slate-100 p-3">{typeIcon(notification.type)}</div>
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <p
                                            className={`text-base font-semibold ${
                                                notification.is_read ? 'text-slate-700' : 'text-slate-900'
                                            }`}
                                        >
                                            {notification.title}
                                        </p>
                                        <span className="text-xs text-slate-400">
                                            {formatRelative(notification.created_at)}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                                    {!notification.is_read && (
                                        <button
                                            onClick={() => markAsRead(notification.id)}
                                            className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 px-4 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                            Mark as read
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {showPopup && unreadNotifications.length > 0 && (
                <div className="fixed inset-0 z-40 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-sm rounded-3xl border border-blue-100 bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-3 border-b border-blue-50 px-5 py-4">
                            <div>
                                <p className="text-sm font-semibold text-blue-600">New Notifications</p>
                                <p className="text-base font-bold text-slate-900">
                                    {unreadNotifications.length} unread item{unreadNotifications.length > 1 ? 's' : ''}
                                </p>
                            </div>
                            <button
                                onClick={handleClosePopup}
                                className="rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="max-h-72 overflow-y-auto px-5 py-4 space-y-3">
                            {unreadNotifications.slice(0, 3).map((notification) => (
                                <div key={notification.id} className="rounded-2xl border border-blue-50 bg-blue-50/60 p-3">
                                    <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                                    <p className="text-xs text-slate-600 mt-1">{notification.message}</p>
                                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                                        <span>{formatRelative(notification.created_at)}</span>
                                        <button
                                            onClick={() => markAsRead(notification.id)}
                                            className="inline-flex items-center gap-1 rounded-full border border-blue-200 px-3 py-0.5 text-blue-600 hover:bg-blue-50"
                                        >
                                            <Check className="w-3 h-3" />
                                            Done
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-blue-50 px-5 py-4">
                            <button
                                onClick={handleClosePopup}
                                className="text-sm font-medium text-slate-500 hover:text-slate-700"
                            >
                                Remind me later
                            </button>
                            <button
                                onClick={markAllAsRead}
                                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                            >
                                <Check className="w-4 h-4" />
                                Mark all read
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

