<?php

use App\Models\User;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\Schedule;
use Carbon\Carbon;

beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);

    $this->patient = User::factory()->create([
        'role' => 'patient',
        'status' => 'active',
    ]);

    $this->doctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
    ]);

    $this->service = Service::create([
        'name' => 'Dental Checkup',
        'description' => 'Regular dental checkup',
        'price' => 100.00,
        'duration_minutes' => 30,
        'category' => 'preventive',
        'is_active' => true,
    ]);
});

test('admin can list all appointments', function () {
    Appointment::factory()->count(3)->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/appointments');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'data' => [
                '*' => ['id', 'patient_id', 'doctor_id', 'service_id', 'status'],
            ],
            'stats',
        ]);
});

test('patient can only see their own appointments', function () {
    $otherPatient = User::factory()->create(['role' => 'patient', 'status' => 'active']);

    Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
    ]);

    Appointment::factory()->create([
        'patient_id' => $otherPatient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
    ]);

    $response = $this->actingAs($this->patient)
        ->getJson('/api/appointments');

    $response->assertStatus(200);
    $appointments = $response->json('data');
    
    expect($appointments)->toHaveCount(1)
        ->and($appointments[0]['patient_id'])->toBe($this->patient->id);
});

test('staff can only see their assigned appointments', function () {
    $otherDoctor = User::factory()->create([
        'role' => 'staff',
        'status' => 'active',
        'position' => 'dentist',
    ]);

    Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
    ]);

    Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $otherDoctor->id,
        'service_id' => $this->service->id,
    ]);

    $response = $this->actingAs($this->doctor)
        ->getJson('/api/appointments');

    $response->assertStatus(200);
    $appointments = $response->json('data');
    
    expect($appointments)->toHaveCount(1)
        ->and($appointments[0]['doctor_id'])->toBe($this->doctor->id);
});

test('can filter appointments by date', function () {
    $today = now()->format('Y-m-d');
    $tomorrow = now()->addDay()->format('Y-m-d');

    Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'appointment_date' => $today,
    ]);

    Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'appointment_date' => $tomorrow,
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson("/api/appointments?date={$today}");

    $response->assertStatus(200);
    $appointments = $response->json('data');
    
    expect($appointments)->toHaveCount(1)
        ->and($appointments[0]['appointment_date'])->toContain($today);
});

test('can filter appointments by status', function () {
    Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'status' => 'scheduled',
    ]);

    Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'status' => 'completed',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/appointments?status=completed');

    $response->assertStatus(200);
    $appointments = $response->json('data');
    
    expect($appointments)->toHaveCount(1)
        ->and($appointments[0]['status'])->toBe('completed');
});

test('can create appointment with valid schedule', function () {
    Schedule::create([
        'staff_id' => $this->doctor->id,
        'date' => now()->addDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    $appointmentDate = now()->addDay()->format('Y-m-d');
    $appointmentTime = '10:00';

    $response = $this->actingAs($this->admin)
        ->postJson('/api/appointments', [
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'service_id' => $this->service->id,
            'appointment_date' => $appointmentDate,
            'appointment_time' => $appointmentTime,
            'reason_for_visit' => 'Regular checkup',
        ]);

    $response->assertStatus(201)
        ->assertJson([
            'success' => true,
            'message' => 'Appointment booked successfully',
        ]);

    $this->assertDatabaseHas('appointments', [
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'status' => 'scheduled',
    ]);
});

test('cannot create appointment without available schedule', function () {
    $appointmentDate = now()->addDay()->format('Y-m-d');
    $appointmentTime = '10:00';

    $response = $this->actingAs($this->admin)
        ->postJson('/api/appointments', [
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'service_id' => $this->service->id,
            'appointment_date' => $appointmentDate,
            'appointment_time' => $appointmentTime,
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['appointment_time']);
});

test('cannot create appointment outside schedule time', function () {
    Schedule::create([
        'staff_id' => $this->doctor->id,
        'date' => now()->addDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    $appointmentDate = now()->addDay()->format('Y-m-d');
    $appointmentTime = '18:00'; // Outside schedule

    $response = $this->actingAs($this->admin)
        ->postJson('/api/appointments', [
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'service_id' => $this->service->id,
            'appointment_date' => $appointmentDate,
            'appointment_time' => $appointmentTime,
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['appointment_time']);
});

test('can check in appointment', function () {
    $appointment = Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'status' => 'scheduled',
        'appointment_date' => now()->addDay(),
    ]);

    $response = $this->actingAs($this->admin)
        ->postJson("/api/appointments/{$appointment->id}/check-in");

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'message' => 'Patient checked in successfully.',
        ]);

    $appointment->refresh();
    expect($appointment->status)->toBe('checked_in')
        ->and($appointment->checked_in_at)->not->toBeNull();
});

test('can complete appointment', function () {
    $appointment = Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'status' => 'checked_in',
    ]);

    $response = $this->actingAs($this->admin)
        ->postJson("/api/appointments/{$appointment->id}/complete", [
            'completion_notes' => 'Treatment completed successfully',
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'message' => 'Appointment completed successfully. Transaction created for billing.',
        ]);

    $appointment->refresh();
    expect($appointment->status)->toBe('completed');
});

test('can cancel appointment', function () {
    $appointment = Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'status' => 'scheduled',
        'appointment_date' => now()->addDay(),
    ]);

    $response = $this->actingAs($this->patient)
        ->postJson("/api/appointments/{$appointment->id}/cancel", [
            'reason' => 'Patient request',
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'message' => 'Appointment cancelled successfully.',
        ]);

    $appointment->refresh();
    expect($appointment->status)->toBe('cancelled');
});

test('patient can only cancel their own appointments', function () {
    $otherPatient = User::factory()->create(['role' => 'patient', 'status' => 'active']);
    
    $appointment = Appointment::factory()->create([
        'patient_id' => $otherPatient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'status' => 'scheduled',
        'appointment_date' => now()->addDay(),
    ]);

    $response = $this->actingAs($this->patient)
        ->postJson("/api/appointments/{$appointment->id}/cancel");

    $response->assertStatus(403);
});

test('can get available appointment slots', function () {
    Schedule::create([
        'staff_id' => $this->doctor->id,
        'date' => now()->addDay(),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    $date = now()->addDay()->format('Y-m-d');

    $response = $this->getJson("/api/appointments/available-slots?doctor_id={$this->doctor->id}&date={$date}&duration=30");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'data' => [
                '*' => ['time', 'display', 'available'],
            ],
        ]);
});

test('can update appointment', function () {
    $appointment = Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'status' => 'scheduled',
    ]);

    Schedule::create([
        'staff_id' => $this->doctor->id,
        'date' => now()->addDays(2),
        'start_time' => now()->setTime(9, 0),
        'end_time' => now()->setTime(17, 0),
        'is_available' => true,
    ]);

    $newDate = now()->addDays(2)->format('Y-m-d');

    $response = $this->actingAs($this->admin)
        ->putJson("/api/appointments/{$appointment->id}", [
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'service_id' => $this->service->id,
            'appointment_date' => $newDate,
            'appointment_time' => '10:00',
            'status' => 'confirmed',
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'message' => 'Appointment updated successfully.',
        ]);

    $appointment->refresh();
    expect($appointment->status)->toBe('confirmed');
});

test('can delete appointment', function () {
    $appointment = Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
    ]);

    $response = $this->actingAs($this->admin)
        ->deleteJson("/api/appointments/{$appointment->id}");

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'message' => 'Appointment deleted successfully.',
        ]);

    $this->assertDatabaseMissing('appointments', ['id' => $appointment->id]);
});

test('appointment stats are calculated correctly', function () {
    Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'appointment_date' => now(),
        'status' => 'scheduled',
    ]);

    Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'status' => 'completed',
    ]);

    Appointment::factory()->create([
        'patient_id' => $this->patient->id,
        'doctor_id' => $this->doctor->id,
        'service_id' => $this->service->id,
        'status' => 'cancelled',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/appointments');

    $response->assertStatus(200);
    $stats = $response->json('stats');
    
    expect($stats['today'])->toBeGreaterThanOrEqual(1)
        ->and($stats['completed'])->toBe(1)
        ->and($stats['cancelled'])->toBe(1);
});

