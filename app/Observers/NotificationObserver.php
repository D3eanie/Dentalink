<?php

namespace App\Observers;

use App\Models\Notification as AppNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\NotificationMail;

class NotificationObserver
{
    public function created(AppNotification $notification)
    {
        Log::info('NotificationObserver invoked', ['notification_id' => $notification->id]);

        // Only send email if enabled (use config so cached env works)
        if (!config('mail.notifications_enabled', false)) {
            Log::info('NotificationObserver aborted: mail.notifications_enabled is false');
            return;
        }

        try {
            $user = $notification->user;
            Log::info('NotificationObserver found user', ['notification_id' => $notification->id, 'user_id' => $user->id ?? null, 'email' => $user->email ?? null]);
            if (!$user || empty($user->email)) {
                Log::info('NotificationObserver aborted: user or email missing', ['notification_id' => $notification->id]);
                return;
            }

            // Send the mail synchronously (not queued)
            Log::info('NotificationObserver attempting Mail::send', ['notification_id' => $notification->id, 'to' => $user->email]);
            Mail::to($user->email)->send(new NotificationMail($notification));
            Log::info('NotificationObserver Mail::send finished', ['notification_id' => $notification->id]);

            // Log success so we can confirm delivery attempts
            Log::info('Notification email sent', [
                'notification_id' => $notification->id,
                'to' => $user->email,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to send notification email', [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
