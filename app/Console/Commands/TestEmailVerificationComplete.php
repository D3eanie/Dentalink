<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TestEmailVerificationComplete extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'test:email-verification-complete';

    /**
     * The console command description.
     */
    protected $description = 'Test that email verification notice is marked as read when user verifies email';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing email verification complete workflow...');
        $this->newLine();

        // Create a test user
        $user = User::create([
            'name' => 'Email Verification Complete Test',
            'email' => 'email-complete-' . time() . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'patient',
        ]);

        $this->info('✓ User created (unverified)');
        $this->line('  Email: ' . $user->email);
        $this->newLine();

        // Check initial notification status
        $notification = DB::table('notifications')
            ->where('user_id', $user->id)
            ->where('type', 'email_verification')
            ->first();

        $this->info('Initial notification status:');
        $this->line('  Is Read: ' . ($notification->is_read ? 'YES' : 'NO'));
        $this->line('  Read At: ' . ($notification->read_at ? $notification->read_at : 'NULL'));
        $this->newLine();

        // Mark email as verified
        $this->info('Marking email as verified...');
        $user->email_verified_at = now();
        $user->save();
        $this->line('✓ Email verified');

        // Force refresh to check DB state
        $user->refresh();
        $this->line('  User email_verified_at: ' . $user->email_verified_at);
        $this->newLine();

        // Check updated notification status
        $updatedNotification = DB::table('notifications')
            ->where('user_id', $user->id)
            ->where('type', 'email_verification')
            ->first();

        $this->info('Updated notification status:');
        $this->line('  Is Read: ' . ($updatedNotification->is_read ? 'YES' : 'NO'));
        $this->line('  Read At: ' . ($updatedNotification->read_at ? $updatedNotification->read_at : 'NULL'));
        $this->newLine();

        if ($updatedNotification->is_read && $updatedNotification->read_at) {
            $this->info('SUCCESS: Notification automatically marked as read when email verified!');
        } else {
            $this->error('NOTE: Notification status was not updated');
        }
    }
}
