import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import {
    Bell,
    MailOpen,
    CheckCircle,
    Calendar,
    PhilippinePeso,
    AlertTriangle,
    XCircle,
    Loader2
} from 'lucide-react';

// Assuming ApiStaff.ts has been configured in your project
// and includes methods like getNotifications, markAsRead, and markAllAsRead.
import apiStaff from '@/services/ApiStaff';

// ====================================================================
// 1. INTERFACES
// ====================================================================

interface NotificationItem {
    id: number;
    title: string;
    message: string;
    read_at: string | null;
    type: 'appointment' | 'system' | 'financial' | 'user_activity';
    created_at: string;
    link?: string; // Optional link to the related resource (e.g., /admin/appointments/123)
}

// ====================================================================
// 2. HELPER FUNCTIONS & LOGIC
// ====================================================================

// Utility to format time difference
const timeAgo = (dateString: string): string => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(past);
};

// Utility to get icon based on notification type
const getNotificationIcon = (type: NotificationItem['type'], read: boolean): JSX.Element => {
    const baseClass = `w-5 h-5 ${read ? 'text-gray-400' : ''}`;

    switch (type) {
        case 'appointment':
            return <Calendar className={`${baseClass} text-green-500`} />;
        case 'financial':
            return <PhilippinePeso className={`${baseClass} text-purple-500`} />;
        case 'user_activity':
            return <CheckCircle className={`${baseClass} text-blue-500`} />;
        case 'system':
            return <AlertTriangle className={`${baseClass} text-red-500`} />;
        default:
            return <Bell className={`${baseClass} text-gray-500`} />;
    }
};

// ====================================================================
// 3. REACT COMPONENT
// ====================================================================

export default function NotificationDropdown() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // Ref for detecting clicks outside the dropdown
    const dropdownRef = useRef<HTMLDivElement>(null);

    // --- Data Fetching ---
    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            // NOTE: This assumes apiStaff.getNotifications() returns an ApiResponse
            // with a data property containing the NotificationItem[] array.
            const response = await apiStaff.getNotifications();
            const fetchedData: NotificationItem[] = response.data || [];

            setNotifications(fetchedData.slice(0, 15)); // Limit to 15 recent notifications
            setUnreadCount(fetchedData.filter(n => !n.read_at).length);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            // Optionally, show a toast error using apiStaff.showErrorToast
        } finally {
            setIsLoading(false);
        }
    };

    // --- Actions ---
    const handleMarkAsRead = async (id: number, link?: string) => {
        const notification = notifications.find(n => n.id === id);
        if (!notification || notification.read_at) {
            // If already read, just navigate
            if (link) window.location.href = link;
            return;
        }

        try {
            // NOTE: This assumes apiStaff.markAsRead(id) exists and marks it on the server
            await apiStaff.markAsRead(id);
            apiStaff.showSuccessToast('Notification marked as read.');

            // Optimistically update the UI
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, read_at: new Date().toISOString() } : n
            ));
            setUnreadCount(prev => prev > 0 ? prev - 1 : 0);

            // Navigate if a link is provided
            if (link) window.location.href = link;
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            apiStaff.showErrorToast('Failed to update notification status.');
        }
    };

    const handleMarkAllAsRead = async () => {
        if (unreadCount === 0) return;
        setIsLoading(true);

        try {
            // NOTE: This assumes apiStaff.markAllAsRead() exists
            await apiStaff.markAllAsRead();
            apiStaff.showSuccessToast('All notifications marked as read.');

            // Optimistically update the UI
            setNotifications(prev => prev.map(n =>
                n.read_at ? n : { ...n, read_at: new Date().toISOString() }
            ));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            apiStaff.showErrorToast('Failed to mark all notifications as read.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Effects ---
    useEffect(() => {
        fetchNotifications();
    }, []);

    // Effect to close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownRef]);

    // --- Rendering ---
    return (
        <div className="relative" ref={dropdownRef}>
            {/* Notification Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 transition duration-150"
                aria-label="Notifications"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50">

                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        <button
                            onClick={handleMarkAllAsRead}
                            disabled={unreadCount === 0 || isLoading}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <MailOpen className="w-4 h-4" /> Mark all as read
                        </button>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                        {isLoading ? (
                            <div className="p-6 text-center text-gray-500">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                <CheckCircle className="w-8 h-8 mx-auto text-green-400 mb-2" />
                                You're all caught up!
                            </div>
                        ) : (
                            notifications.map(notification => {
                                const isUnread = !notification.read_at;

                                // Wrap the item content in an invisible Link component
                                // to handle navigation via Inertia.js
                                const NotificationContent = (
                                    <div className={`flex items-start p-4 cursor-pointer hover:bg-gray-50 transition ${isUnread ? 'bg-blue-50' : ''}`}>
                                        <div className="flex-shrink-0 mr-3 p-2 bg-gray-100 rounded-full">
                                            {getNotificationIcon(notification.type, !isUnread)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                                                {notification.title}
                                            </p>
                                            <p className={`text-sm ${isUnread ? 'text-gray-700' : 'text-gray-500'}`}>
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {timeAgo(notification.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                );

                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleMarkAsRead(notification.id, notification.link)}
                                        role="button"
                                    >
                                        {/* Use Link if you want full Inertia functionality, otherwise simple div with onClick is fine */}
                                        {notification.link ? (
                                            <Link href={notification.link} preserveScroll>
                                                {NotificationContent}
                                            </Link>
                                        ) : (
                                            NotificationContent
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer (View All) */}
                    <div className="p-2 border-t border-gray-100 text-center">
                        <Link
                            href="/admin/notifications"
                            className="block text-sm font-medium text-blue-600 hover:text-blue-700 py-1"
                        >
                            View All Notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
