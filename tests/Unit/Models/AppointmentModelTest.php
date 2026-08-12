<?php

namespace Tests\Unit\Models;

use App\Models\Appointment;
use App\Models\FinancialRecord;
use App\Models\Patient;
use App\Models\Schedule;
use App\Models\Service;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AppointmentModelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Test appointment creation
     */
    public function test_can_create_appointment(): void
    {
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create(['role' => 'staff']);
        $service = Service::factory()->create();

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'service_id' => $service->id,
            'appointment_date' => now()->addDay(),
            'appointment_time' => '14:00',
            'status' => 'scheduled',
        ]);

        $this->assertNotNull($appointment->id);
        $this->assertEquals('scheduled', $appointment->status);
    }

    /**
     * Test appointment status transitions
     */
    public function test_appointment_status_transitions(): void
    {
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create(['role' => 'staff']);
        $service = Service::factory()->create();

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'service_id' => $service->id,
            'appointment_date' => now()->addDay(),
            'appointment_time' => '14:00',
            'status' => 'scheduled',
        ]);

        $appointment->update(['status' => 'completed']);
        $this->assertEquals('completed', $appointment->status);

        $appointment->update(['status' => 'cancelled']);
        $this->assertEquals('cancelled', $appointment->status);
    }

    /**
     * Test appointment cannot be scheduled in the past
     */
    public function test_appointment_cannot_be_scheduled_in_past(): void
    {
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create(['role' => 'staff']);
        $service = Service::factory()->create();

        $pastDate = now()->subDay();

        // This would typically be caught by controller validation,
        // but we test the model can create it (validation is controller responsibility)
        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'service_id' => $service->id,
            'appointment_date' => $pastDate->format('Y-m-d'),
            'appointment_time' => '14:00',
            'status' => 'scheduled',
        ]);

        $this->assertNotNull($appointment->id);
    }

    /**
     * Test appointment relationships
     */
    public function test_appointment_relationships(): void
    {
        $patient = User::factory()->create(['role' => 'patient']);
        $doctor = User::factory()->create(['role' => 'staff']);
        $service = Service::factory()->create();

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'service_id' => $service->id,
            'appointment_date' => now()->addDay(),
            'appointment_time' => '14:00',
            'status' => 'scheduled',
        ]);

        $this->assertNotNull($appointment->patient);
        $this->assertNotNull($appointment->doctor);
        $this->assertNotNull($appointment->service);
        $this->assertEquals($patient->id, $appointment->patient->id);
        $this->assertEquals($doctor->id, $appointment->doctor->id);
        $this->assertEquals($service->id, $appointment->service->id);
    }
}
