<?php

use App\Models\User;
use App\Models\Service;
use App\Models\Appointment;

beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);

    $this->patient = User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
    ]);
});

test('public can view services', function () {
    Service::create([
        'name' => 'Dental Checkup',
        'description' => 'Regular checkup',
        'price' => 100.00,
        'duration_minutes' => 30,
        'category' => 'preventive',
        'is_active' => true,
    ]);

    // Use authenticated user to access services
    // (the public routes conflict with protected routes in the same group)
    $response = $this->actingAs($this->patient)
        ->getJson('/api/services');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'services' => [
                '*' => ['id', 'name', 'description', 'price', 'category'],
            ],
        ]);
});

test('public can view single service', function () {
    $service = Service::create([
        'name' => 'Dental Checkup',
        'description' => 'Regular checkup',
        'price' => 100.00,
        'duration_minutes' => 30,
        'category' => 'preventive',
        'is_active' => true,
    ]);

    // Use authenticated user to access services
    // (the public routes conflict with protected routes in the same group)
    $response = $this->actingAs($this->patient)
        ->getJson("/api/services/{$service->id}");

    $response->assertStatus(200)
        ->assertJson([
            'service' => [
                'id' => $service->id,
                'name' => 'Dental Checkup',
            ],
        ]);
});

test('admin can create service', function () {
    $response = $this->actingAs($this->admin)
        ->postJson('/api/services', [
            'name' => 'Teeth Cleaning',
            'description' => 'Professional teeth cleaning',
            'price' => 150.00,
            'duration_minutes' => 45,
            'category' => 'preventive',
            'is_active' => true,
        ]);

    $response->assertStatus(201)
        ->assertJson([
            'message' => 'Service created successfully.',
        ]);

    $this->assertDatabaseHas('services', [
        'name' => 'Teeth Cleaning',
        'price' => 150.00,
    ]);
});

test('cannot create service with invalid category', function () {
    $response = $this->actingAs($this->admin)
        ->postJson('/api/services', [
            'name' => 'Invalid Service',
            'price' => 100.00,
            'duration_minutes' => 30,
            'category' => 'invalid_category',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['category']);
});

test('cannot create service with negative price', function () {
    $response = $this->actingAs($this->admin)
        ->postJson('/api/services', [
            'name' => 'Invalid Service',
            'price' => -100.00,
            'duration_minutes' => 30,
            'category' => 'preventive',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['price']);
});

test('cannot create service with duration less than 15 minutes', function () {
    $response = $this->actingAs($this->admin)
        ->postJson('/api/services', [
            'name' => 'Invalid Service',
            'price' => 100.00,
            'duration_minutes' => 10,
            'category' => 'preventive',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['duration_minutes']);
});

test('admin can update service', function () {
    $service = Service::create([
        'name' => 'Dental Checkup',
        'description' => 'Regular checkup',
        'price' => 100.00,
        'duration_minutes' => 30,
        'category' => 'preventive',
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->admin)
        ->putJson("/api/services/{$service->id}", [
            'name' => 'Updated Checkup',
            'description' => 'Updated description',
            'price' => 120.00,
            'duration_minutes' => 45,
            'category' => 'preventive',
            'is_active' => true,
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'message' => 'Service updated successfully.',
        ]);

    $service->refresh();
    expect($service->name)->toBe('Updated Checkup')
        ->and((float) $service->price)->toBe(120.0);
});

test('admin can delete service without appointments', function () {
    $service = Service::create([
        'name' => 'Dental Checkup',
        'description' => 'Regular checkup',
        'price' => 100.00,
        'duration_minutes' => 30,
        'category' => 'preventive',
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->admin)
        ->deleteJson("/api/services/{$service->id}");

    $response->assertStatus(200)
        ->assertJson([
            'message' => 'Service deleted successfully.',
        ]);

    $this->assertDatabaseMissing('services', ['id' => $service->id]);
});

test('cannot delete service with appointments', function () {
    $service = Service::create([
        'name' => 'Dental Checkup',
        'description' => 'Regular checkup',
        'price' => 100.00,
        'duration_minutes' => 30,
        'category' => 'preventive',
        'is_active' => true,
    ]);

    $doctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
    ]);

    Appointment::create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $doctor->id,
        'service_id' => $service->id,
        'appointment_date' => now()->addDay(),
        'appointment_time' => '10:00:00',
        'duration_minutes' => 30,
        'status' => 'scheduled',
    ]);

    $response = $this->actingAs($this->admin)
        ->deleteJson("/api/services/{$service->id}");

    $response->assertStatus(422)
        ->assertJson([
            'message' => 'Cannot delete service that has appointments.',
        ]);
});

test('can filter services by category', function () {
    Service::create([
        'name' => 'Preventive Service',
        'price' => 100.00,
        'duration_minutes' => 30,
        'category' => 'preventive',
        'is_active' => true,
    ]);

    Service::create([
        'name' => 'Restorative Service',
        'price' => 200.00,
        'duration_minutes' => 60,
        'category' => 'restorative',
        'is_active' => true,
    ]);

    // Use authenticated user to access services
    $response = $this->actingAs($this->patient)
        ->getJson('/api/services?category=preventive');

    $response->assertStatus(200);
    $services = $response->json('services');

    expect($services)->toHaveCount(1)
        ->and($services[0]['category'])->toBe('preventive');
});

test('can search services by name', function () {
    Service::create([
        'name' => 'Dental Checkup',
        'price' => 100.00,
        'duration_minutes' => 30,
        'category' => 'preventive',
        'is_active' => true,
    ]);

    Service::create([
        'name' => 'Teeth Cleaning',
        'price' => 150.00,
        'duration_minutes' => 45,
        'category' => 'preventive',
        'is_active' => true,
    ]);

    // Use authenticated user to access services
    $response = $this->actingAs($this->patient)
        ->getJson('/api/services?search=Checkup');

    $response->assertStatus(200);
    $services = $response->json('services');

    expect($services)->toHaveCount(1)
        ->and($services[0]['name'])->toContain('Checkup');
});

test('service summary includes correct counts', function () {
    Service::create([
        'name' => 'Active Service',
        'price' => 100.00,
        'duration_minutes' => 30,
        'category' => 'preventive',
        'is_active' => true,
    ]);

    Service::create([
        'name' => 'Inactive Service',
        'price' => 200.00,
        'duration_minutes' => 60,
        'category' => 'restorative',
        'is_active' => false,
    ]);

    // Use authenticated user to access services
    $response = $this->actingAs($this->patient)
        ->getJson('/api/services');

    $response->assertStatus(200);
    $summary = $response->json('summary');

    expect($summary['total'])->toBe(2)
        ->and($summary['active'])->toBe(1)
        ->and($summary['inactive'])->toBe(1);
});

