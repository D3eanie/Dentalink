<?php

// 1. USER SEEDER - database/seeders/UserSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Create Admin User
        User::create([
            'name' => 'System Administrator',
            'email' => 'admin@dentalink.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'phone' => '+1234567890',
            'address' => '123 Admin Street, City, State',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        // Create Staff Users - Dentists
        User::create([
            'name' => 'Dr. Sarah Johnson',
            'email' => 'sarah.johnson@dentalink.com',
            'password' => Hash::make('password123'),
            'role' => 'staff',
            'phone' => '+1234567891',
            'address' => '456 Dentist Ave, City, State',
            'status' => 'active',
            'employee_id' => 'EMP001',
            'position' => 'dentist',
            'license_number' => 'DDS123456',
            'license_expiry' => now()->addYears(2),
            'hire_date' => now()->subMonths(12),
            'hourly_rate' => 75.00,
            'specializations' => ['General Dentistry', 'Cosmetic Dentistry'],
            'bio' => 'Dr. Johnson has over 10 years of experience in general and cosmetic dentistry.',
            'years_experience' => 10,
            'email_verified_at' => now(),
        ]);

        User::create([
            'name' => 'Dr. Michael Chen',
            'email' => 'michael.chen@dentalink.com',
            'password' => Hash::make('password123'),
            'role' => 'staff',
            'phone' => '+1234567892',
            'address' => '789 Dental Blvd, City, State',
            'status' => 'active',
            'employee_id' => 'EMP002',
            'position' => 'dentist',
            'license_number' => 'DDS789012',
            'license_expiry' => now()->addYears(3),
            'hire_date' => now()->subMonths(18),
            'hourly_rate' => 80.00,
            'specializations' => ['Orthodontics', 'Oral Surgery'],
            'bio' => 'Dr. Chen specializes in orthodontics and oral surgery with 15 years of experience.',
            'years_experience' => 15,
            'email_verified_at' => now(),
        ]);

        // Create Staff Users - Hygienists
        User::create([
            'name' => 'Lisa Rodriguez',
            'email' => 'lisa.rodriguez@dentalink.com',
            'password' => Hash::make('password123'),
            'role' => 'staff',
            'phone' => '+1234567893',
            'address' => '321 Hygiene St, City, State',
            'status' => 'active',
            'employee_id' => 'EMP003',
            'position' => 'hygienist',
            'license_number' => 'RDH345678',
            'license_expiry' => now()->addYears(2),
            'hire_date' => now()->subMonths(8),
            'hourly_rate' => 35.00,
            'specializations' => ['Preventive Care', 'Periodontal Therapy'],
            'bio' => 'Lisa is a certified dental hygienist with expertise in preventive care.',
            'years_experience' => 8,
            'email_verified_at' => now(),
        ]);

        // Create Staff Users - Receptionist
        User::create([
            'name' => 'Jennifer Smith',
            'email' => 'jennifer.smith@dentalink.com',
            'password' => Hash::make('password123'),
            'role' => 'staff',
            'phone' => '+1234567894',
            'address' => '654 Reception Rd, City, State',
            'status' => 'active',
            'employee_id' => 'EMP004',
            'position' => 'receptionist',
            'hire_date' => now()->subMonths(6),
            'hourly_rate' => 18.00,
            'bio' => 'Jennifer manages front desk operations and patient scheduling.',
            'years_experience' => 5,
            'email_verified_at' => now(),
        ]);

        // Create Sample Patients
        User::create([
            'name' => 'John Doe',
            'email' => 'john.doe@email.com',
            'password' => Hash::make('password123'),
            'role' => 'patient',
            'phone' => '+1234567895',
            'address' => '123 Patient Lane, City, State',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        User::create([
            'name' => 'Jane Wilson',
            'email' => 'jane.wilson@email.com',
            'password' => Hash::make('password123'),
            'role' => 'patient',
            'phone' => '+1234567896',
            'address' => '456 Patient Ave, City, State',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }
}
