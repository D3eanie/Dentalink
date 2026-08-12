<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        $schedule->command('appointments:auto-cancel-no-show')
            ->everyFiveMinutes()
            ->name('appointments_auto_cancel_no_show')
            ->description('Auto-cancel appointments 15 minutes after scheduled time if not checked in')
            ->withoutOverlapping()
            ->onFailure(function () {
                \Log::error('Auto-cancel no-show appointments command failed');
            })
            ->onSuccess(function () {
                \Log::info('Auto-cancel no-show appointments command completed successfully');
            });

        // Inactivate patients who haven't had an appointment in 30 days
        // Runs daily at 2:00 AM
        $schedule->command('patients:inactivate --days=30')
            ->daily()
            ->at('02:00')
            ->name('inactivate_patients')
            ->description('Set inactive patients status to inactive')
            ->withoutOverlapping()
            ->onFailure(function () {
                \Log::error('Patient inactivation command failed');
            })
            ->onSuccess(function () {
                \Log::info('Patient inactivation command completed successfully');
            });
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
