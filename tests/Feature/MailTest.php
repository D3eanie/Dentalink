<?php

use App\Mail\NotificationMail;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    Mail::fake();
});

describe('NotificationMail', function () {
    it('can be instantiated with a notification model', function () {
        $user = User::factory()->create();
        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'title' => 'Test Notification',
            'message' => 'This is a test message',
        ]);

        $mail = new NotificationMail($notification);

        expect($mail->notificationModel)->toBe($notification);
    });

    it('builds mail with correct subject from notification title', function () {
        $user = User::factory()->create();
        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'title' => 'Appointment Reminder',
        ]);

        $mail = new NotificationMail($notification);
        $built = $mail->build();

        expect($built->subject)->toBe('Appointment Reminder');
    });

    it('uses the correct from address and name from config', function () {
        $user = User::factory()->create();
        $notification = Notification::factory()->create(['user_id' => $user->id]);

        $mail = new NotificationMail($notification);
        $built = $mail->build();

        $fromAddress = config('mail.from.address');
        $fromName = config('mail.from.name');

        expect($built->from[0]['address'])->toBe($fromAddress);
        expect($built->from[0]['name'])->toBe($fromName);
    });

    it('uses markdown view for email template', function () {
        $user = User::factory()->create();
        $notification = Notification::factory()->create(['user_id' => $user->id]);

        $mail = new NotificationMail($notification);
        $built = $mail->build();

        // Verify the mail has been properly built with markdown
        expect($built)->not->toBeNull();
        expect($built->subject)->toBe($notification->title);
    });

    it('passes notification and user data to view', function () {
        $user = User::factory()->create(['name' => 'John Doe']);
        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'title' => 'Important Update',
            'message' => 'You have an important update',
        ]);

        $mail = new NotificationMail($notification);
        $built = $mail->build();

        expect($built->viewData['notification']->id)->toBe($notification->id);
        expect($built->viewData['notification']->title)->toBe($notification->title);
        expect($built->viewData['user']->id)->toBe($user->id);
        expect($built->viewData['user']->name)->toBe($user->name);
    });

    it('can be mailable with different notification types', function () {
        $user = User::factory()->create();

        $types = ['appointment', 'reminder', 'treatment', 'system'];

        foreach ($types as $type) {
            $notification = Notification::factory()->create([
                'user_id' => $user->id,
                'type' => $type,
                'title' => ucfirst($type) . ' Notification',
            ]);

            $mail = new NotificationMail($notification);
            $built = $mail->build();

            expect($built->subject)->toBe(ucfirst($type) . ' Notification');
        }
    });

    it('serializes the notification model correctly', function () {
        $user = User::factory()->create();
        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'title' => 'Serialization Test',
        ]);

        $mail = new NotificationMail($notification);

        // Verify the mailable can be serialized (important for queuing)
        $serialized = serialize($mail);
        $unserialized = unserialize($serialized);

        expect($unserialized->notificationModel->id)->toBe($notification->id);
        expect($unserialized->notificationModel->title)->toBe($notification->title);
    });
});
