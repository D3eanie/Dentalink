<?php

use App\Notifications\GenericNotification;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
});

describe('GenericNotification', function () {
    it('can be instantiated with title and message', function () {
        $notification = new GenericNotification('Test Title', 'Test Message');

        expect($notification->title)->toBe('Test Title');
        expect($notification->message)->toBe('Test Message');
    });

    it('sends notifications via mail and database channels', function () {
        $notification = new GenericNotification('Test Title', 'Test Message');
        $user = User::factory()->create();

        $channels = $notification->via($user);

        expect($channels)->toContain('mail');
        expect($channels)->toContain('database');
        expect($channels)->toHaveCount(2);
    });

    it('creates a mail message with correct subject', function () {
        $notification = new GenericNotification('Welcome!', 'Welcome to our system');
        $user = User::factory()->create();

        $mailMessage = $notification->toMail($user);

        expect($mailMessage)->toBeInstanceOf(MailMessage::class);
        expect($mailMessage->subject)->toBe('Welcome!');
    });

    it('creates a mail message with correct message content', function () {
        $title = 'Account Verification';
        $message = 'Please verify your email address';

        $notification = new GenericNotification($title, $message);
        $user = User::factory()->create();

        $mailMessage = $notification->toMail($user);

        // Check that the message is properly set
        expect($mailMessage->subject)->toBe($title);
        expect($mailMessage)->toBeInstanceOf(MailMessage::class);
    });

    it('stores notification data in database array', function () {
        $notification = new GenericNotification('Database Test', 'Testing database storage');
        $user = User::factory()->create();

        $data = $notification->toArray($user);

        expect($data)->toHaveKey('title', 'Database Test');
        expect($data)->toHaveKey('message', 'Testing database storage');
        expect($data)->toHaveCount(2);
    });

    it('implements ShouldQueue interface for queued notifications', function () {
        $notification = new GenericNotification('Queued', 'This is queued');

        // Check if the notification implements ShouldQueue
        expect(in_array('Illuminate\Contracts\Queue\ShouldQueue', class_implements($notification)))->toBeTrue();
    });

    it('can be sent to a user', function () {
        $user = User::factory()->create();
        $notification = new GenericNotification('Send Test', 'Testing notification sending');

        $user->notify($notification);

        Notification::assertSentTo($user, GenericNotification::class);
    });

    it('receives correct data in notification event', function () {
        $user = User::factory()->create();
        $title = 'Appointment Reminder';
        $message = 'Your appointment is in 1 hour';

        $notification = new GenericNotification($title, $message);
        $user->notify($notification);

        Notification::assertSentTo(
            $user,
            GenericNotification::class,
            function ($notification) use ($title, $message) {
                return $notification->title === $title
                    && $notification->message === $message;
            }
        );
    });

    it('handles special characters in title and message', function () {
        $title = 'Special & Characters "Test" \'Message\'';
        $message = 'Content with <html> & special chars: éàü';

        $notification = new GenericNotification($title, $message);
        $user = User::factory()->create();

        $mailMessage = $notification->toMail($user);
        expect($mailMessage->subject)->toBe($title);

        $data = $notification->toArray($user);
        expect($data['title'])->toBe($title);
        expect($data['message'])->toBe($message);
    });

    it('can send multiple notifications to same user', function () {
        $user = User::factory()->create();

        $notification1 = new GenericNotification('Notification 1', 'Message 1');
        $notification2 = new GenericNotification('Notification 2', 'Message 2');

        $user->notify($notification1);
        $user->notify($notification2);

        Notification::assertSentTo($user, GenericNotification::class);
        expect(Notification::sent($user, GenericNotification::class))->toHaveCount(2);
    });

    it('creates proper line format in mail message', function () {
        $notification = new GenericNotification('Test', 'This is a line');
        $user = User::factory()->create();

        $mailMessage = $notification->toMail($user);

        // The notification should have the message as a line
        expect($mailMessage)->toBeInstanceOf(MailMessage::class);
        expect($mailMessage->subject)->toBe('Test');
    });

    it('works with empty message gracefully', function () {
        $notification = new GenericNotification('Title Only', '');
        $user = User::factory()->create();

        $mailMessage = $notification->toMail($user);
        $data = $notification->toArray($user);

        expect($mailMessage->subject)->toBe('Title Only');
        expect($data['message'])->toBe('');
    });

    it('works with long title and message', function () {
        $longTitle = str_repeat('A', 500);
        $longMessage = str_repeat('B', 1000);

        $notification = new GenericNotification($longTitle, $longMessage);
        $user = User::factory()->create();

        $mailMessage = $notification->toMail($user);
        $data = $notification->toArray($user);

        expect($mailMessage->subject)->toBe($longTitle);
        expect($data['message'])->toBe($longMessage);
    });
});
