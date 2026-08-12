<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Schedule;
use Illuminate\Support\Facades\Log;

class CleanupPastSchedules extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'schedules:cleanup-past {--dry-run : Show what would be deleted without actually deleting}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up past schedules that have no appointments';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $isDryRun = $this->option('dry-run');
        
        $pastSchedules = Schedule::past()
            ->whereDoesntHave('appointments', function ($query) {
                $query->whereNotIn('status', ['cancelled', 'no_show']);
            })
            ->get();

        $count = $pastSchedules->count();

        if ($count === 0) {
            $this->info('No past schedules to clean up.');
            return 0;
        }

        if ($isDryRun) {
            $this->info("Would delete {$count} past schedule(s):");
            foreach ($pastSchedules as $schedule) {
                $this->line("  - Schedule ID {$schedule->id} for {$schedule->staff->name} on {$schedule->formatted_date}");
            }
            return 0;
        }

        $deleted = Schedule::cleanupPastSchedules();
        
        $this->info("Successfully deleted {$deleted} past schedule(s).");
        Log::info("Cleaned up {$deleted} past schedules", [
            'command' => 'schedules:cleanup-past',
            'deleted_count' => $deleted
        ]);

        return 0;
    }
}
