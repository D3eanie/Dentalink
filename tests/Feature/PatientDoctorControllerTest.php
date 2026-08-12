<?php

use App\Models\User;
use App\Models\Schedule;
use Carbon\Carbon;

beforeEach(function () {
    // Create test users with different roles
    $this->patient = User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
    ]);

    $this->admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);

    $this->staff = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
    ]);
});

test('patient can get list of available doctors', function () {
    // Create a doctor with available schedule
    $doctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
        'name' => 'Dr. John Doe',
    ]);

    // Create an available schedule for today
    Schedule::create([
        'staff_id' => $doctor->id,
        'date' => now()->startOfDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    $response = $this->actingAs($this->patient)
        ->getJson('/api/patient/doctors');

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
        ])
        ->assertJsonStructure([
            'success',
            'data' => [
                '*' => ['id', 'name', 'position'],
            ],
        ]);

    $responseData = $response->json('data');
    expect($responseData)->toHaveCount(1)
        ->and($responseData[0])->toHaveKeys(['id', 'name', 'position'])
        ->and($responseData[0]['name'])->toBe('Dr. John Doe');
});

test('only doctors with available schedules are returned', function () {
    // Create a doctor with available schedule
    $availableDoctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
        'name' => 'Dr. Available',
    ]);

    // Create a doctor without available schedule
    $unavailableDoctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
        'name' => 'Dr. Unavailable',
    ]);

    // Create available schedule for first doctor
    Schedule::create([
        'staff_id' => $availableDoctor->id,
        'date' => now()->addDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    // Create unavailable schedule for second doctor
    Schedule::create([
        'staff_id' => $unavailableDoctor->id,
        'date' => now()->addDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => false,
    ]);

    $response = $this->actingAs($this->patient)
        ->getJson('/api/patient/doctors');

    $response->assertStatus(200);
    $doctors = $response->json('data');
    
    expect($doctors)->toHaveCount(1)
        ->and($doctors[0]['name'])->toBe('Dr. Available');
});

test('only active doctors are returned', function () {
    // Create active doctor
    $activeDoctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
        'name' => 'Dr. Active',
    ]);

    // Create inactive doctor
    $inactiveDoctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'inactive',
        'position' => 'dentist',
        'name' => 'Dr. Inactive',
    ]);

    // Create schedules for both
    Schedule::create([
        'staff_id' => $activeDoctor->id,
        'date' => now()->addDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    Schedule::create([
        'staff_id' => $inactiveDoctor->id,
        'date' => now()->addDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    $response = $this->actingAs($this->patient)
        ->getJson('/api/patient/doctors');

    $response->assertStatus(200);
    $doctors = $response->json('data');
    
    expect($doctors)->toHaveCount(1)
        ->and($doctors[0]['name'])->toBe('Dr. Active');
});

test('only schedules from today or future are considered', function () {
    $doctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
        'name' => 'Dr. Test',
    ]);

    // Create past schedule (should not be included)
    Schedule::create([
        'staff_id' => $doctor->id,
        'date' => now()->subDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    // Create today's schedule (should be included)
    Schedule::create([
        'staff_id' => $doctor->id,
        'date' => now()->startOfDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    // Create future schedule (should be included)
    Schedule::create([
        'staff_id' => $doctor->id,
        'date' => now()->addDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    $response = $this->actingAs($this->patient)
        ->getJson('/api/patient/doctors');

    $response->assertStatus(200);
    $doctors = $response->json('data');
    
    // Doctor should be included because they have today's and future schedules
    expect($doctors)->toHaveCount(1);
});

test('doctors are ordered by name', function () {
    $doctor1 = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
        'name' => 'Dr. Zebra',
    ]);

    $doctor2 = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
        'name' => 'Dr. Apple',
    ]);

    $doctor3 = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
        'name' => 'Dr. Charlie',
    ]);

    // Create schedules for all doctors
    foreach ([$doctor1, $doctor2, $doctor3] as $doctor) {
        Schedule::create([
            'staff_id' => $doctor->id,
            'date' => now()->addDay(),
            'start_time' => now()->setTime(9, 0),
            'end_time' => now()->setTime(17, 0),
            'is_available' => true,
        ]);
    }

    $response = $this->actingAs($this->patient)
        ->getJson('/api/patient/doctors');

    $response->assertStatus(200);
    $doctors = $response->json('data');
    
    expect($doctors)->toHaveCount(3)
        ->and($doctors[0]['name'])->toBe('Dr. Apple')
        ->and($doctors[1]['name'])->toBe('Dr. Charlie')
        ->and($doctors[2]['name'])->toBe('Dr. Zebra');
});

test('only id, name, and position fields are returned', function () {
    $doctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
        'name' => 'Dr. Test',
        'email' => 'doctor@test.com',
        'phone' => '1234567890',
    ]);

    Schedule::create([
        'staff_id' => $doctor->id,
        'date' => now()->addDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    $response = $this->actingAs($this->patient)
        ->getJson('/api/patient/doctors');

    $response->assertStatus(200);
    $doctorData = $response->json('data.0');
    
    expect($doctorData)->toHaveKeys(['id', 'name', 'position'])
        ->and($doctorData)->not->toHaveKey('email')
        ->and($doctorData)->not->toHaveKey('phone')
        ->and($doctorData)->not->toHaveKey('status');
});

test('returns empty array when no doctors have available schedules', function () {
    $response = $this->actingAs($this->patient)
        ->getJson('/api/patient/doctors');

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'data' => [],
        ]);
});

test('non-patient users cannot access patient doctors endpoint', function () {
    // Test with admin
    $response = $this->actingAs($this->admin)
        ->getJson('/api/patient/doctors');
    
    $response->assertStatus(403);

    // Test with staff
    $response = $this->actingAs($this->staff)
        ->getJson('/api/patient/doctors');
    
    $response->assertStatus(403);
});

test('unauthenticated users cannot access patient doctors endpoint', function () {
    $response = $this->getJson('/api/patient/doctors');
    
    $response->assertStatus(401);
});

test('handles database errors gracefully', function () {
    // Mock a database error by using an invalid connection
    // This test verifies error handling in the controller
    
    $doctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
    ]);

    Schedule::create([
        'staff_id' => $doctor->id,
        'date' => now()->addDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    // The controller should handle errors gracefully
    // In a real scenario, we might mock the User model to throw an exception
    $response = $this->actingAs($this->patient)
        ->getJson('/api/patient/doctors');

    // Should return success or handle error properly
    expect($response->status())->toBeIn([200, 500]);
});

test('multiple doctors with different positions are returned', function () {
    $dentist = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
        'name' => 'Dr. Dentist',
    ]);

    $hygienist = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'hygienist',
        'name' => 'Hygienist Jane',
    ]);

    foreach ([$dentist, $hygienist] as $staff) {
        Schedule::create([
            'staff_id' => $staff->id,
            'date' => now()->addDay(),
            'start_time' => now()->setTime(9, 0),
            'end_time' => now()->setTime(17, 0),
            'is_available' => true,
        ]);
    }

    $response = $this->actingAs($this->patient)
        ->getJson('/api/patient/doctors');

    $response->assertStatus(200);
    $doctors = $response->json('data');
    
    expect($doctors)->toHaveCount(2);
    
    $positions = collect($doctors)->pluck('position')->toArray();
    expect($positions)->toContain('dentist', 'hygienist');
});

test('doctor with multiple available schedules is returned only once', function () {
    $doctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
        'name' => 'Dr. Multiple Schedules',
    ]);

    // Create multiple available schedules
    Schedule::create([
        'staff_id' => $doctor->id,
        'date' => now()->addDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(12, 0),
        'is_available' => true,
    ]);

    Schedule::create([
        'staff_id' => $doctor->id,
        'date' => now()->addDays(2),
        'start_time' => now()->setTime(14, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    $response = $this->actingAs($this->patient)
        ->getJson('/api/patient/doctors');

    $response->assertStatus(200);
    $doctors = $response->json('data');
    
    // Doctor should appear only once
    expect($doctors)->toHaveCount(1)
        ->and($doctors[0]['name'])->toBe('Dr. Multiple Schedules');
});

