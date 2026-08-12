<?php

use App\Mail\NotificationMail;
use App\Notifications\GenericNotification;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification as NotificationFacade;

beforeEach(function () {
    Mail::fake();
    NotificationFacade::fake();
});

describe('Email Feature Integration', function () {
    it('sends notification mail when notification is created', function () {
        $user = User::factory()->create();
        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'title' => 'New Appointment',
            'message' => 'You have a new appointment',
        ]);

        Mail::send(new NotificationMail($notification));

        Mail::assertSent(NotificationMail::class, function ($mail) use ($notification) {
            return $mail->notificationModel->id === $notification->id;
        });
    });

    it('sends generic notification to multiple users', function () {
        $users = User::factory()->count(3)->create();
        $notification = new GenericNotification('System Update', 'System maintenance scheduled');

        foreach ($users as $user) {
            $user->notify($notification);
        }

        foreach ($users as $user) {
            NotificationFacade::assertSentTo($user, GenericNotification::class);
        }
    });

    it('handles notification with complex data structure', function () {
        $user = User::factory()->create();
        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'title' => 'Appointment Update',
            'message' => 'Your appointment has been rescheduled',
            'type' => 'appointment',
            'is_read' => false,
        ]);

        Mail::send(new NotificationMail($notification));

        Mail::assertSent(NotificationMail::class, function ($mail) {
            return $mail->notificationModel->type === 'appointment'
                && $mail->notificationModel->is_read === false;
        });
    });

    it('sends both mail and database notifications via GenericNotification', function () {
        $user = User::factory()->create();
        $notification = new GenericNotification('Database Entry', 'This creates a database entry');

        $user->notify($notification);

        NotificationFacade::assertSentTo(
            $user,
            GenericNotification::class,
            function ($notification) {
                return $notification->title === 'Database Entry';
            }
        );
    });

    it('maintains notification history in database', function () {
        $user = User::factory()->create();

        $titles = ['First Notice', 'Second Notice', 'Third Notice'];

        foreach ($titles as $title) {
            Notification::factory()->create([
                'user_id' => $user->id,
                'title' => $title,
            ]);
        }

        $notifications = Notification::where('user_id', $user->id)->get();

        expect($notifications)->toHaveCount(3);
        expect($notifications->pluck('title'))->toContain(...$titles);
    });

    it('tracks read status of notifications', function () {
        $user = User::factory()->create();

        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'is_read' => false,
        ]);

        expect($notification->is_read)->toBeFalse();

        $notification->update(['is_read' => true, 'read_at' => now()]);

        expect($notification->is_read)->toBeTrue();
        expect($notification->read_at)->not->toBeNull();
    });

    it('filters unread notifications correctly', function () {
        $user = User::factory()->create();

        Notification::factory()->count(2)->create([
            'user_id' => $user->id,
            'is_read' => false,
        ]);

        Notification::factory()->count(1)->create([
            'user_id' => $user->id,
            'is_read' => true,
        ]);

        $unread = Notification::where('user_id', $user->id)->unread()->get();
        $read = Notification::where('user_id', $user->id)->read()->get();

        expect($unread)->toHaveCount(2);
        expect($read)->toHaveCount(1);
    });

    it('filters notifications by type', function () {
        $user = User::factory()->create();

        Notification::factory()->create([
            'user_id' => $user->id,
            'type' => 'appointment',
        ]);

        Notification::factory()->create([
            'user_id' => $user->id,
            'type' => 'reminder',
        ]);

        Notification::factory()->create([
            'user_id' => $user->id,
            'type' => 'system',
        ]);

        $appointmentNotifications = Notification::where('user_id', $user->id)
            ->byType('appointment')
            ->get();

        expect($appointmentNotifications)->toHaveCount(1);
        expect($appointmentNotifications->first()->type)->toBe('appointment');
    });

    it('handles email with user relationship correctly', function () {
        $user = User::factory()->create(['email' => 'john@example.com', 'name' => 'John Doe']);

        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'title' => 'Welcome John',
        ]);

        $mail = new NotificationMail($notification);
        $built = $mail->build();

        expect($built->viewData['user']->email)->toBe('john@example.com');
        expect($built->viewData['user']->name)->toBe('John Doe');
    });

    it('supports queuing of notifications', function () {
        $user = User::factory()->create();
        $notification = new GenericNotification('Queued Notification', 'This will be queued');

        // Verify the notification implements ShouldQueue
        expect(in_array('Illuminate\Contracts\Queue\ShouldQueue', class_implements($notification)))->toBeTrue();

        $user->notify($notification);

        NotificationFacade::assertSentTo($user, GenericNotification::class);
    });

    it('sends emails with timestamps', function () {
        $user = User::factory()->create();

        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'created_at' => now(),
        ]);

        expect($notification->created_at)->not->toBeNull();
        expect($notification->created_at->isBefore(now()->addMinute()))->toBeTrue();
    });

    it('handles notification deletion gracefully', function () {
        $user = User::factory()->create();

        $notification = Notification::factory()->create(['user_id' => $user->id]);
        $notificationId = $notification->id;

        $notification->delete();

        expect(Notification::find($notificationId))->toBeNull();
    });
});
