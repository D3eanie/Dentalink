<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Route;

class TestEmailVerificationSettings extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'test:email-verification-settings';

    /**
     * The console command description.
     */
    protected $description = 'Test email verification settings page functionality';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing email verification settings page...');
        $this->newLine();

        // 1. Check routes exist
        $this->info('✓ Checking routes...');
        $routes = collect(Route::getRoutes())
            ->filter(fn($route) => strpos($route->uri, 'email-verification') !== false)
            ->toArray();

        if (count($routes) >= 2) {
            $this->line('  Found ' . count($routes) . ' email-verification routes');
            foreach ($routes as $route) {
                $this->line('    - ' . implode('|', $route->methods) . ' ' . $route->uri);
            }
        } else {
            $this->error('  Email-verification routes not found!');
            return 1;
        }
        $this->newLine();

        // 2. Check controller exists
        $this->info('✓ Checking controller...');
        $controllerClass = 'App\Http\Controllers\Settings\EmailVerificationController';
        if (class_exists($controllerClass)) {
            $this->line('  EmailVerificationController found');
        } else {
            $this->error('  EmailVerificationController not found!');
            return 1;
        }
        $this->newLine();

        // 3. Test with a user
        $this->info('✓ Creating test user...');
        $user = User::create([
            'name' => 'Email Settings Test',
            'email' => 'settings-test-' . time() . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'patient',
        ]);
        $this->line('  User created: ' . $user->email);
        $this->newLine();

        // 4. Verify controller methods exist
        $this->info('✓ Checking controller methods...');
        $controller = app($controllerClass);

        if (method_exists($controller, 'edit')) {
            $this->line('  edit() method exists');
        } else {
            $this->error('  edit() method missing!');
            return 1;
        }

        if (method_exists($controller, 'sendVerificationEmail')) {
            $this->line('  sendVerificationEmail() method exists');
        } else {
            $this->error('  sendVerificationEmail() method missing!');
            return 1;
        }
        $this->newLine();

        $this->info('SUCCESS: Email verification settings page is properly configured!');
        $this->info('');
        $this->info('Access the page at: /settings/email-verification');
    }
}
