<?php

namespace App\Observers;

use App\Models\User;
use App\Models\Notification;

class UserObserver
{
    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        // Add email verification notice if email not yet verified
        if (!$user->email_verified_at) {
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Email Verification Required',
                'message' => 'Please verify your email address to complete your account setup. Check your inbox for a verification link.',
                'type' => 'email_verification',
                'is_read' => false,
            ]);
        }
    }

    /**
     * Handle the User "updated" event.
     */
    public function updated(User $user): void
    {
        \Illuminate\Support\Facades\Log::info('UserObserver updated called', [
            'user_id' => $user->id,
            'email_verified_at' => $user->email_verified_at,
            'was_changed' => $user->wasChanged('email_verified_at') ? 'YES' : 'NO',
        ]);

        // Mark email verification notice as read when email is verified
        if ($user->email_verified_at) {
            \Illuminate\Support\Facades\Log::info('Email verified, marking notification as read', [
                'user_id' => $user->id,
                'email_verified_at' => $user->email_verified_at,
            ]);

            Notification::where('user_id', $user->id)
                ->where('type', 'email_verification')
                ->whereNull('read_at')
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);
        }
    }
}
