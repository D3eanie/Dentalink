<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\VerifyEmail;
use App\Notifications\ResetPassword;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class TestEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:test {type?} {email?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test email functionality (types: basic, verify, reset)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $type = $this->argument('type') ?? $this->choice(
            'What type of email do you want to test?',
            ['basic', 'verify', 'reset'],
            0
        );

        $email = $this->argument('email') ?? $this->ask('Enter recipient email address', 'test@example.com');

        $this->info("Testing {$type} email to {$email}...");
        $this->newLine();

        try {
            switch ($type) {
                case 'basic':
                    $this->testBasicEmail($email);
                    break;
                case 'verify':
                    $this->testVerificationEmail($email);
                    break;
                case 'reset':
                    $this->testPasswordResetEmail($email);
                    break;
                default:
                    $this->error("Unknown email type: {$type}");
                    return 1;
            }

            $this->newLine();
            $this->info('✓ Email sent successfully!');

            if (config('mail.default') === 'log') {
                $this->info('✓ Check storage/logs/laravel.log for email content');
            }

            return 0;
        } catch (\Exception $e) {
            $this->error('✗ Failed to send email: ' . $e->getMessage());
            return 1;
        }
    }

    /**
     * Test basic email functionality
     */
    protected function testBasicEmail($email)
    {
        Mail::raw('This is a test email from Dentalink. If you received this, email sending is working correctly!', function ($message) use ($email) {
            $message->to($email)
                ->subject('Test Email - Dentalink');
        });

        $this->line('Basic test email sent.');
    }

    /**
     * Test email verification notification
     */
    protected function testVerificationEmail($email)
    {
        // Find or create a test user
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->warn("User with email {$email} not found. Creating test user...");

            $user = User::create([
                'name' => 'Test User',
                'email' => $email,
                'password' => bcrypt('password'),
                'role' => 'patient',
                'email_verified_at' => null,
            ]);

            $this->info("Test user created: {$user->name} ({$user->email})");
        } else {
            $this->info("Using existing user: {$user->name} ({$user->email})");
        }

        // Send verification email
        $user->sendEmailVerificationNotification();

        $this->line('Email verification notification sent.');
        $this->line("User ID: {$user->id}");
    }

    /**
     * Test password reset notification
     */
    protected function testPasswordResetEmail($email)
    {
        // Find or create a test user
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->warn("User with email {$email} not found. Cannot send reset email.");
            return;
        }

        // Generate plain text token (matching our custom implementation)
        $token = \Illuminate\Support\Str::random(64);

        // Store token in database
        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            [
                'token' => $token,
                'created_at' => now(),
            ]
        );

        // Send password reset email via our custom notification
        $user->notify(new ResetPassword($token));

        $this->line('Password reset email sent.');
        $this->info('Check your email for the reset link. The token is valid for 60 minutes.');
    }
}
