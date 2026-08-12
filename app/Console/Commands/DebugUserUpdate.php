<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DebugUserUpdate extends Command
{
    protected $signature = 'debug:user-update';
    protected $description = 'Debug user update and observer';

    public function handle()
    {
        // Create user
        $user = User::create([
            'name' => 'Debug User',
            'email' => 'debug-' . time() . '@test.com',
            'password' => bcrypt('pass'),
            'role' => 'patient',
        ]);

        $this->info('User created: ' . $user->id);
        $this->info('Initial email_verified_at: ' . ($user->email_verified_at ? $user->email_verified_at : 'NULL'));
        $this->newLine();

        // Check notification
        $notif = DB::table('notifications')->where('user_id', $user->id)->where('type', 'email_verification')->first();
        $this->info('Notification created: ' . ($notif ? 'YES' : 'NO'));
        $this->newLine();

        // Update with direct assignment
        $this->info('Updating via direct assignment...');
        $user->email_verified_at = now();
        $user->save();
        $this->line('Saved');

        // Refresh and check
        $user->refresh();
        $this->info('After refresh - email_verified_at: ' . ($user->email_verified_at ? $user->email_verified_at : 'NULL'));
        $this->newLine();

        // Check notification update
        $notif2 = DB::table('notifications')->where('user_id', $user->id)->where('type', 'email_verification')->first();
        $this->info('Notification status after update:');
        $this->line('  Is Read: ' . ($notif2->is_read ? 'YES' : 'NO'));
        $this->line('  Read At: ' . ($notif2->read_at ? $notif2->read_at : 'NULL'));
    }
}
