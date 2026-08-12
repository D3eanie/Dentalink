<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use Illuminate\Http\Request;

class TestPasswordResetFlow extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:password-reset-flow {email?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the complete password reset flow through the controller';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email') ?? $this->ask('Enter email address', 'fraezedsloth@gmail.com');

        $this->info('=== COMPLETE PASSWORD RESET FLOW TEST ===');
        $this->newLine();

        // Step 1: Check user exists
        $user = User::where('email', $email)->first();
        if (!$user) {
            $this->error("User with email {$email} not found!");
            return 1;
        }
        $this->info("✓ User found: {$user->name}");

        // Step 2: Simulate the forgot password form request
        $this->info("✓ Simulating forgot password request...");

        // Clear old tokens
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        // Create a fake request
        $request = new Request(['email' => $email]);

        try {
            // Call the controller method directly
            $controller = new PasswordResetLinkController();
            $response = $controller->store($request);

            $this->info("✓ Controller executed successfully");
        } catch (\Exception $e) {
            $this->error("✗ Controller error: " . $e->getMessage());
            return 1;
        }

        // Step 3: Get token from database
        $tokenRecord = DB::table('password_reset_tokens')->where('email', $email)->first();
        if (!$tokenRecord) {
            $this->error("✗ Token not stored in database!");
            return 1;
        }

        $this->newLine();
        $this->info("✓ Token stored in database");
        $this->line("  Token: " . substr($tokenRecord->token, 0, 40) . "...");
        $this->line("  Token length: " . strlen($tokenRecord->token));
        $this->line("  Is bcrypt hash? " . (str_starts_with($tokenRecord->token, '$2y$') ? 'YES (ERROR!)' : 'NO (CORRECT!)'));

        // Step 4: Generate reset URL
        $resetUrl = url(route('password.reset', ['token' => $tokenRecord->token], false)) . "?email=" . urlencode($email);
        $this->newLine();
        $this->line("Reset URL:");
        $this->line($resetUrl);

        // Step 5: Test token validation in controller
        $this->newLine();
        $this->info("Testing token validation...");

        $newPassword = 'TestPassword123!';
        $resetRequest = new Request([
            'token' => $tokenRecord->token,
            'email' => $email,
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
        ]);

        try {
            $resetController = new \App\Http\Controllers\Auth\NewPasswordController();
            $result = $resetController->store($resetRequest);

            $this->info("✓ Password reset successful!");
            $this->line("  User redirected to: " . $result->getTargetUrl());

            // Restore original password
            $user->update(['password' => Hash::make('password')]);
            $this->info("✓ Original password restored");

            return 0;
        } catch (\Throwable $e) {
            $this->error("✗ Password reset failed!");
            $this->error("  Error: " . $e->getMessage());
            $this->error("  File: " . $e->getFile() . ":" . $e->getLine());
            return 1;
        }
    }
}
