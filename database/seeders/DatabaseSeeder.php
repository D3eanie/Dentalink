<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Call the UserSeeder to populate users including admin account
        $this->call(UserSeeder::class);

        // Call the ServiceSeeder to populate dental services
        $this->call(ServiceSeeder::class);
    }
}
