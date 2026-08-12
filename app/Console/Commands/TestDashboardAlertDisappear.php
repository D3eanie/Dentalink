<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\DashboardController;

class TestDashboardAlertDisappear extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'test:dashboard-alert-disappear';

    /**
     * The console command description.
     */
    protected $description = 'Test that email verification alert disappears after email is verified';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing email verification alert disappearance on verification...');
        $this->newLine();

        // Create an unverified test user
        $this->info('✓ Step 1: Creating unverified test user...');
        $user = User::create([
            'name' => 'Alert Disappear Test',
            'email' => 'disappear-test-' . time() . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'patient',
            'email_verified_at' => null,
        ]);
        $this->line('  User created: ' . $user->email);
        $this->newLine();

        // Check initial dashboard data
        $this->info('✓ Step 2: Checking dashboard data (before verification)...');
        $reflection = new \ReflectionClass(DashboardController::class);
        $method = $reflection->getMethod('getPatientDashboardData');
        $method->setAccessible(true);
        $dashboardController = app(DashboardController::class);

        $dashboardData = $method->invoke($dashboardController, $user);
        $emailVerificationAlert = collect($dashboardData['alerts'])
            ->where('type', 'email_verification')
            ->first();

        if ($emailVerificationAlert) {
            $this->line('  ✓ Email verification alert is present');
        } else {
            $this->error('  ✗ Email verification alert is missing!');
        }
        $this->newLine();

        // Verify the email
        $this->info('✓ Step 3: Verifying email address...');
        $user->email_verified_at = now();
        $user->save();
        $this->line('  Email verified: ' . $user->email_verified_at);
        $this->newLine();

        // Check dashboard data after verification
        $this->info('✓ Step 4: Checking dashboard data (after verification)...');

        // Refresh user from database
        $user->refresh();

        $dashboardData = $method->invoke($dashboardController, $user);
        $emailVerificationAlert = collect($dashboardData['alerts'])
            ->where('type', 'email_verification')
            ->first();

        if ($emailVerificationAlert) {
            $this->error('  ✗ Email verification alert is still present!');
            return 1;
        } else {
            $this->line('  ✓ Email verification alert has disappeared');
        }
        $this->newLine();

        // Check notification status
        $this->info('✓ Step 5: Checking notification status in database...');
        $notification = DB::table('notifications')
            ->where('user_id', $user->id)
            ->where('type', 'email_verification')
            ->first();

        if ($notification) {
            $this->line('  Notification is_read: ' . ($notification->is_read ? 'YES' : 'NO'));
            $this->line('  Notification read_at: ' . ($notification->read_at ? $notification->read_at : 'NULL'));

            if ($notification->is_read && $notification->read_at) {
                $this->newLine();
                $this->info('SUCCESS: Email verification alert properly disappears after verification!');
                return 0;
            } else {
                $this->error('  Notification was not marked as read');
                return 1;
            }
        } else {
            $this->error('  Notification not found in database!');
            return 1;
        }
    }
}
