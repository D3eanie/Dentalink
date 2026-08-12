<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\DashboardController;

class TestDashboardEmailVerificationAlert extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'test:dashboard-email-alert';

    /**
     * The console command description.
     */
    protected $description = 'Test that dashboard shows email verification alert for unverified users';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing dashboard email verification alert...');
        $this->newLine();

        // Create an unverified test user
        $this->info('✓ Creating unverified test user...');
        $user = User::create([
            'name' => 'Dashboard Alert Test',
            'email' => 'dashboard-test-' . time() . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'patient',
            'email_verified_at' => null, // Explicitly unverified
        ]);
        $this->line('  User created: ' . $user->email);
        $this->line('  Email verified: ' . ($user->email_verified_at ? 'YES' : 'NO'));
        $this->newLine();

        // Check notification was created
        $this->info('✓ Checking email verification notification...');
        $notification = DB::table('notifications')
            ->where('user_id', $user->id)
            ->where('type', 'email_verification')
            ->first();

        if ($notification) {
            $this->line('  Notification found in database');
            $this->line('    Title: ' . $notification->title);
            $this->line('    Is Read: ' . ($notification->is_read ? 'YES' : 'NO'));
        } else {
            $this->error('  Notification NOT found in database!');
        }
        $this->newLine();

        // Simulate dashboard data request
        $this->info('✓ Testing dashboard data retrieval...');

        $dashboardController = app(DashboardController::class);

        // Use reflection to call the private method
        $reflection = new \ReflectionClass($dashboardController);
        $method = $reflection->getMethod('getPatientDashboardData');
        $method->setAccessible(true);

        try {
            $dashboardData = $method->invoke($dashboardController, $user);

            if (isset($dashboardData['alerts']) && is_array($dashboardData['alerts'])) {
                $emailVerificationAlert = collect($dashboardData['alerts'])
                    ->where('type', 'email_verification')
                    ->first();

                if ($emailVerificationAlert) {
                    $this->line('  Email verification alert found in dashboard data!');
                    $this->line('    Title: ' . ($emailVerificationAlert['title'] ?? 'N/A'));
                    $this->line('    Message: ' . substr($emailVerificationAlert['message'] ?? '', 0, 60) . '...');
                    $this->newLine();
                    $this->info('SUCCESS: Dashboard email verification alert is working!');
                } else {
                    $this->error('  Email verification alert NOT found in dashboard data');
                    $this->error('  Available alerts:');
                    foreach ($dashboardData['alerts'] as $alert) {
                        $this->line('    - ' . $alert['type'] ?? 'unknown' . ': ' . ($alert['message'] ?? $alert['title'] ?? ''));
                    }
                }
            } else {
                $this->error('  No alerts in dashboard response');
            }
        } catch (\Exception $e) {
            $this->error('  Error retrieving dashboard data: ' . $e->getMessage());
        }
    }
}
