<?php

use App\Models\User;
use App\Models\Patient;
use App\Models\Appointment;

beforeEach(function () {
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

test('admin can list patients', function () {
    User::factory()->count(3)->create([
        'role' => 'patient',
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/patients');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'data' => [
                '*' => ['id', 'name', 'email', 'status'],
            ],
        ]);
});

test('can search patients by name', function () {
    User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
        'name' => 'John Doe',
    ]);

    User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
        'name' => 'Jane Smith',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/patients?search=John');

    $response->assertStatus(200);
    $patients = $response->json('data');
    
    expect($patients)->toHaveCount(1)
        ->and($patients[0]['name'])->toContain('John');
});

test('can filter patients by status', function () {
    User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
    ]);

    User::factory()->create([
        'role' => 'patient',
        'status' => 'inactive',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/patients?status=active');

    $response->assertStatus(200);
    $patients = $response->json('data');
    
    expect($patients)->toHaveCount(1)
        ->and($patients[0]['status'])->toBe('active');
});

test('admin can create patient', function () {
    $response = $this->actingAs($this->admin)
        ->postJson('/api/patients', [
            'name' => 'New Patient',
            'email' => 'newpatient@example.com',
            'phone' => '1234567890',
            'birthday' => '1990-01-01',
            'gender' => 'male',
        ]);

    $response->assertStatus(201)
        ->assertJson([
            'success' => true,
            'message' => 'Patient created successfully.',
        ]);

    $this->assertDatabaseHas('users', [
        'email' => 'newpatient@example.com',
        'role' => 'patient',
    ]);

    $user = User::where('email', 'newpatient@example.com')->first();
    $this->assertDatabaseHas('patients', [
        'user_id' => $user->id,
    ]);
});

test('can create patient with first_name and last_name', function () {
    $response = $this->actingAs($this->admin)
        ->postJson('/api/patients', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'johndoe@example.com',
            'birthday' => '1990-01-01',
            'gender' => 'male',
        ]);

    $response->assertStatus(201);

    $this->assertDatabaseHas('users', [
        'email' => 'johndoe@example.com',
        'name' => 'John Doe',
    ]);
});

test('admin can update patient', function () {
    $patient = User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
    ]);

    Patient::create([
        'user_id' => $patient->id,
        'gender' => 'male',
    ]);

    $response = $this->actingAs($this->admin)
        ->putJson("/api/patients/{$patient->id}", [
            'name' => 'Updated Name',
            'email' => $patient->email,
            'phone' => '9876543210',
            'gender' => 'female',
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'message' => 'Patient updated successfully.',
        ]);

    $patient->refresh();
    expect($patient->name)->toBe('Updated Name')
        ->and($patient->phone)->toBe('9876543210');
});

test('admin can delete patient', function () {
    $patient = User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
    ]);

    Patient::create(['user_id' => $patient->id]);

    $response = $this->actingAs($this->admin)
        ->deleteJson("/api/patients/{$patient->id}");

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'message' => 'Patient deleted successfully.',
        ]);

    $this->assertDatabaseMissing('users', ['id' => $patient->id]);
    $this->assertDatabaseMissing('patients', ['user_id' => $patient->id]);
});

test('patient show includes relationships', function () {
    $patient = User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
    ]);

    Patient::create(['user_id' => $patient->id]);

    $doctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
    ]);

    $service = \App\Models\Service::create([
        'name' => 'Checkup',
        'price' => 100.00,
        'duration_minutes' => 30,
        'category' => 'preventive',
        'is_active' => true,
    ]);

    Appointment::create([
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'service_id' => $service->id,
        'appointment_date' => now()->addDay(),
        'appointment_time' => '10:00:00',
        'duration_minutes' => 30,
        'status' => 'scheduled',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson("/api/patients/{$patient->id}");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'data' => ['id', 'name', 'email'],
            'relationships' => [
                'upcomingAppointments',
                'recentRecords',
            ],
        ]);
});

test('patient summary includes gender counts', function () {
    $malePatient = User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
    ]);

    $femalePatient = User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
    ]);

    Patient::create([
        'user_id' => $malePatient->id,
        'gender' => 'male',
    ]);

    Patient::create([
        'user_id' => $femalePatient->id,
        'gender' => 'female',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/patients');

    $response->assertStatus(200);
    $summary = $response->json('summary');
    
    expect($summary['male'])->toBe(1)
        ->and($summary['female'])->toBe(1);
});

test('can filter patients by gender', function () {
    $malePatient = User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
    ]);

    $femalePatient = User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
    ]);

    Patient::create([
        'user_id' => $malePatient->id,
        'gender' => 'male',
    ]);

    Patient::create([
        'user_id' => $femalePatient->id,
        'gender' => 'female',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/patients?gender=female');

    $response->assertStatus(200);
    $patients = $response->json('data');
    
    expect($patients)->toHaveCount(1);
});

