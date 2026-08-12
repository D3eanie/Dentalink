<?php

namespace App\Console\Commands;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Console\Command;
use Carbon\Carbon;

class InactivatePatients extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'patients:inactivate {--days=30 : Number of days of inactivity}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically set patients to inactive status after specified days without appointments (default: 30 days)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $inactiveThreshold = Carbon::now()->subDays($days);

        $this->info("Checking for patients inactive for {$days} days (since {$inactiveThreshold->format('Y-m-d')})...");

        try {
            // Find patients who haven't had an appointment in the specified days
            $inactivePatients = Patient::whereNotNull('last_appointment_date')
                ->where('last_appointment_date', '<', $inactiveThreshold)
                ->with('user')
                ->get();

            if ($inactivePatients->isEmpty()) {
                $this->info('No inactive patients found.');
                return self::SUCCESS;
            }

            $count = 0;
            foreach ($inactivePatients as $patient) {
                // Only inactivate if user is still active
                if ($patient->user && $patient->user->status === 'active') {
                    $patient->user->update(['status' => 'inactive']);
                    $count++;

                    $this->line("✓ Set {$patient->user->name} to inactive (last appointment: {$patient->last_appointment_date->format('Y-m-d')})");
                }
            }

            $this->info("\n✅ Successfully inactivated {$count} patient(s).");
            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Error inactivating patients: {$e->getMessage()}");
            return self::FAILURE;
        }
    }
}
