<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TestEmailVerificationNotice extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'test:email-verification-notice';

    /**
     * The console command description.
     */
    protected $description = 'Test email verification notice creation for new users';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing email verification notice system...');
        $this->newLine();

        // Create a test user
        $user = User::create([
            'name' => 'Email Verification Test User',
            'email' => 'email-verify-' . time() . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'patient',
        ]);

        $this->info('✓ Test user created');
        $this->line('  Email: ' . $user->email);
        $this->line('  User ID: ' . $user->id);
        $this->newLine();

        // Check if notification was created
        $notification = DB::table('notifications')
            ->where('user_id', $user->id)
            ->where('type', 'email_verification')
            ->first();

        if ($notification) {
            $this->info('✓ Email verification notice created in database');
            $this->line('  Title: ' . $notification->title);
            $this->line('  Message: ' . $notification->message);
            $this->line('  Status: ' . ($notification->is_read ? 'Read' : 'Unread'));
            $this->newLine();
            $this->info('SUCCESS: Email verification notice system is working!');
        } else {
            $this->error('✗ Email verification notice was NOT created');
            $this->error('Observer may not be registered properly.');
        }
    }
}
