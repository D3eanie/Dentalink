<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Preventive Services
        Service::create([
            'name' => 'Oral Prophylaxis',
            'description' => 'Teeth Cleaning or Scaling and Polishing',
            'price' => 700.00,
            'duration_minutes' => 15,
            'category' => 'preventive',
            'is_active' => true,
            'requires_multiple_teeth' => false,
        ]);

        Service::create([
            'name' => 'Tooth Extraction',
            'description' => 'Bunot/Tooth removal',
            'price' => 800.00,
            'duration_minutes' => 15,
            'category' => 'preventive',
            'is_active' => true,
            'requires_multiple_teeth' => false,
        ]);

        // Restorative Services
        Service::create([
            'name' => 'Dental Restoration',
            'description' => 'Pasta/Dental filling',
            'price' => 800.00,
            'duration_minutes' => 30,
            'category' => 'restorative',
            'is_active' => true,
            'requires_multiple_teeth' => false,
        ]);

        Service::create([
            'name' => 'Dentures',
            'description' => 'Pustiso',
            'price' => 20000.00,
            'duration_minutes' => 120,
            'category' => 'restorative',
            'is_active' => true,
            'requires_multiple_teeth' => false,
        ]);

        Service::create([
            'name' => 'Orthodontics',
            'description' => 'Braces',
            'price' => 30000.00,
            'duration_minutes' => 120,
            'category' => 'restorative',
            'is_active' => true,
            'requires_multiple_teeth' => false,
        ]);

        // Cosmetic Services
        Service::create([
            'name' => 'Dental Crown',
            'description' => 'Porcelain-Fused-to-Metal or Zirconia',
            'price' => 15000.00,
            'duration_minutes' => 120,
            'category' => 'cosmetic',
            'is_active' => true,
            'requires_multiple_teeth' => false,
        ]);

        // Surgical Services
        Service::create([
            'name' => 'Odontectomy',
            'description' => 'Wisdom tooth removal',
            'price' => 8000.00,
            'duration_minutes' => 30,
            'category' => 'surgical',
            'is_active' => true,
            'requires_multiple_teeth' => false,
        ]);

        // Emergency Services
        Service::create([
            'name' => 'Root Canal Treatment',
            'description' => 'Root canal therapy',
            'price' => 3000.00,
            'duration_minutes' => 90,
            'category' => 'emergency',
            'is_active' => true,
            'requires_multiple_teeth' => false,
        ]);
    }
}
