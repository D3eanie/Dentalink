<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class TestPasswordReset extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:password-reset {email?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the complete password reset flow';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email') ?? $this->ask('Enter email address', 'fraezedsloth@gmail.com');

        $this->info('=== PASSWORD RESET FLOW TEST ===');
        $this->newLine();

        // Step 1: Check if user exists
        $user = User::where('email', $email)->first();
        if (!$user) {
            $this->error("User with email {$email} not found!");
            return 1;
        }
        $this->info("✓ User found: {$user->name} (ID: {$user->id})");

        // Step 2: Clear any existing tokens for this email
        DB::table('password_reset_tokens')->where('email', $email)->delete();
        $this->info("✓ Cleared existing tokens");

        // Step 3: Create PLAIN TEXT token (not hashed)
        $token = \Illuminate\Support\Str::random(64);
        $this->info("✓ Generated plain text token");

        // Step 4: Store plain text token in database
        DB::table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => $token,
            'created_at' => now(),
        ]);
        $this->info("✓ Token stored as plain text in database");

        // Step 5: Generate reset URL
        $resetUrl = url(route('password.reset', ['token' => $token], false));
        $this->newLine();
        $this->line("Reset URL:");
        $this->line($resetUrl);

        // Step 6: Test token validation with plain text
        $this->newLine();
        $this->info("Testing token validation...");

        $testPassword = 'NewPassword123!';
        $testPasswordConfirm = 'NewPassword123!';

        $status = Password::reset(
            [
                'email' => $email,
                'password' => $testPassword,
                'password_confirmation' => $testPasswordConfirm,
                'token' => $token,  // Using plain text token
            ],
            function ($user) use ($testPassword) {
                $user->forceFill([
                    'password' => Hash::make($testPassword),
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            $this->info("✓ Token validation successful!");
            $this->info("✓ Password would be reset");

            // Restore original password
            $user->update(['password' => Hash::make('password')]);
            $this->info("✓ Original password restored for testing");

            return 0;
        } else {
            $this->error("✗ Token validation failed!");
            $this->error("  Status: {$status}");

            // Debug: Show what's in the database
            $storedToken = DB::table('password_reset_tokens')->where('email', $email)->first();
            if ($storedToken) {
                $this->line("  Stored token matches: " . ($storedToken->token === $token ? 'YES' : 'NO'));
            }

            return 1;
        }
    }
}
