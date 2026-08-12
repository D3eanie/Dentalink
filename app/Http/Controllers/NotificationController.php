<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->input('type');
        $status = $request->input('status');
        $isRead = $request->input('is_read');
        $priority = $request->input('priority');

        $userId = Auth::id();
        
        \Log::info('NotificationController@index', [
            'user_id' => $userId,
            'filters' => $request->only(['type', 'status', 'is_read', 'priority']),
            'total_notifications_for_user' => Notification::where('user_id', $userId)->count()
        ]);

        $notifications = Notification::where('user_id', $userId)
            ->when($type, function ($query, $type) {
                return $query->where('type', $type);
            })
            ->when($status === 'read', function ($query) {
                return $query->where('is_read', true);
            })
            ->when($status === 'unread', function ($query) {
                return $query->where('is_read', false);
            })
            ->when($isRead !== null, function ($query) use ($isRead) {
                return $query->where('is_read', $isRead == 'true' || $isRead == '1');
            })
            ->when($priority, function ($query, $priority) {
                return $query->where('priority', $priority);
            })
            ->orderBy('created_at', 'desc')
            ->get();
            
        \Log::info('NotificationController@index - Query result', [
            'user_id' => $userId,
            'notifications_count' => $notifications->count(),
            'notification_ids' => $notifications->pluck('id')->toArray()
        ]);

        $unreadCount = Notification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->count();

        $stats = [
            'total' => Notification::where('user_id', Auth::id())->count(),
            'unread' => $unreadCount,
            'read' => Notification::where('user_id', Auth::id())
                ->where('is_read', true)
                ->count(),
        ];

        // Handle API/JSON requests
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'data' => $notifications,
                'stats' => $stats,
                'unreadCount' => $unreadCount,
                'filters' => $request->only(['type', 'status', 'is_read', 'priority']),
            ]);
        }

        // Handle Inertia page requests
        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
            'stats' => $stats,
            'filters' => $request->only(['type', 'status', 'is_read', 'priority']),
        ]);
    }

    public function markAsRead(Request $request, $notificationId)
    {
        // Handle both route parameter and Notification model binding
        $notification = $notificationId instanceof Notification 
            ? $notificationId 
            : Notification::findOrFail($notificationId);

        if ($notification->user_id !== Auth::id()) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to notification.'
                ], 403);
            }
            return back()->with('error', 'Unauthorized access to notification.');
        }

        $notification->update([
            'is_read' => true,
            'read_at' => now()
        ]);

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Notification marked as read.',
                'notification' => $notification->fresh()
            ]);
        }

        return back()->with('success', 'Notification marked as read.');
    }

    public function markAsUnread(Request $request, $notificationId)
    {
        $notification = $notificationId instanceof Notification 
            ? $notificationId 
            : Notification::findOrFail($notificationId);

        if ($notification->user_id !== Auth::id()) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to notification.'
                ], 403);
            }
            return back()->with('error', 'Unauthorized access to notification.');
        }

        $notification->update([
            'is_read' => false,
            'read_at' => null
        ]);

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Notification marked as unread.',
                'notification' => $notification->fresh()
            ]);
        }

        return back()->with('success', 'Notification marked as unread.');
    }

    public function markAllAsRead(Request $request)
    {
        $updated = Notification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'All notifications marked as read.',
                'updated_count' => $updated
            ]);
        }

        return back()->with('success', 'All notifications marked as read.');
    }

    public function destroy(Request $request, $notificationId)
    {
        $notification = $notificationId instanceof Notification 
            ? $notificationId 
            : Notification::findOrFail($notificationId);

        if ($notification->user_id !== Auth::id()) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to notification.'
                ], 403);
            }
            return back()->with('error', 'Unauthorized access to notification.');
        }

        $notification->delete();

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Notification deleted.'
            ]);
        }

        return back()->with('success', 'Notification deleted.');
    }

    public function getUnreadCount(Request $request)
    {
        $count = Notification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->count();
        
        return response()->json([
            'success' => true,
            'count' => $count
        ]);
    }

    public function getRecent(Request $request)
    {
        $limit = $request->input('limit', 5);
        
        $notifications = Notification::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
        
        return response()->json([
            'success' => true,
            'notifications' => $notifications
        ]);
    }
}