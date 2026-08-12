<?php

namespace Tests\Unit\Models;

use App\Models\ToothRecord;
use App\Models\User;
use App\Models\PatientRecord;
use App\Models\Appointment;
use App\Models\Service;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class ToothRecordModelTest extends TestCase
{
    use RefreshDatabase;

    protected User $patient;
    protected User $doctor;
    protected PatientRecord $patientRecord;
    protected Appointment $appointment;
    protected Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test users
        $this->patient = User::factory()->create();
        $this->doctor = User::factory()->create();

        // Create patient record
        $this->patientRecord = PatientRecord::factory()->create([
            'patient_id' => $this->patient->id,
        ]);

        // Create appointment
        $this->appointment = Appointment::factory()->create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
        ]);

        // Create service
        $this->service = Service::factory()->create();
    }

    /**
     * Test can create tooth record
     */
    public function test_can_create_tooth_record(): void
    {
        $toothRecord = ToothRecord::create([
            'patient_record_id' => $this->patientRecord->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'tooth_number' => 16,
            'tooth_position' => 'Upper Right',
            'surface' => 'Occlusal',
            'service' => 'Filling',
            'treatment_type' => 'Filling',
            'treatment_description' => 'Class I cavity restoration',
            'material_type' => 'Composite',
            'materials_used' => ['Composite Resin', 'Bonding Agent'],
            'tooth_status' => 'treated',
            'tooth_condition' => 'decay',
            'clinical_notes' => 'Successfully restored',
            'date_done' => now(),
            'treatment_date' => now(),
            'next_review_date' => now()->addMonths(6),
        ]);

        $this->assertNotNull($toothRecord->id);
        $this->assertEquals(16, $toothRecord->tooth_number);
        $this->assertEquals('Filling', $toothRecord->treatment_type);
        $this->assertEquals('treated', $toothRecord->tooth_status);
    }

    /**
     * Test tooth record patient relationship
     */
    public function test_tooth_record_patient_relationship(): void
    {
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
        ]);

        $this->assertNotNull($toothRecord->patient);
        $this->assertEquals($this->patient->id, $toothRecord->patient->id);
    }

    /**
     * Test tooth record doctor/dentist relationship
     */
    public function test_tooth_record_dentist_relationship(): void
    {
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'doctor_id' => $this->doctor->id,
        ]);

        $this->assertNotNull($toothRecord->doctor);
        $this->assertEquals($this->doctor->id, $toothRecord->doctor->id);
        $this->assertNotNull($toothRecord->dentist);
        $this->assertEquals($this->doctor->id, $toothRecord->dentist->id);
    }

    /**
     * Test tooth record patient record relationship
     */
    public function test_tooth_record_patient_record_relationship(): void
    {
        $toothRecord = ToothRecord::factory()->create([
            'patient_record_id' => $this->patientRecord->id,
            'patient_id' => $this->patient->id,
        ]);

        $this->assertNotNull($toothRecord->patientRecord);
        $this->assertEquals($this->patientRecord->id, $toothRecord->patientRecord->id);
    }

    /**
     * Test tooth record appointment relationship
     */
    public function test_tooth_record_appointment_relationship(): void
    {
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'appointment_id' => $this->appointment->id,
        ]);

        $this->assertNotNull($toothRecord->appointment);
        $this->assertEquals($this->appointment->id, $toothRecord->appointment->id);
    }

    /**
     * Test tooth record service relationship
     */
    public function test_tooth_record_service_relationship(): void
    {
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'service_id' => $this->service->id,
        ]);

        $this->assertNotNull($toothRecord->serviceRecord);
        $this->assertEquals($this->service->id, $toothRecord->serviceRecord->id);
    }

    /**
     * Test get tooth name for valid tooth number
     */
    public function test_get_tooth_name(): void
    {
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'tooth_number' => 16,
        ]);

        $toothName = $toothRecord->getToothName();
        $this->assertStringContainsString('Tooth #16', $toothName);
        $this->assertStringContainsString('Upper Right', $toothName);
        $this->assertStringContainsString('First Molar', $toothName);
    }

    /**
     * Test get tooth name for all valid tooth numbers
     */
    public function test_get_tooth_name_for_all_teeth(): void
    {
        $validToothNumbers = [11, 12, 13, 14, 15, 16, 17, 18, // Upper Right
                              21, 22, 23, 24, 25, 26, 27, 28, // Upper Left
                              31, 32, 33, 34, 35, 36, 37, 38, // Lower Left
                              41, 42, 43, 44, 45, 46, 47, 48]; // Lower Right

        foreach ($validToothNumbers as $toothNumber) {
            $toothRecord = ToothRecord::factory()->create([
                'patient_id' => $this->patient->id,
                'patient_record_id' => $this->patientRecord->id,
                'tooth_number' => $toothNumber,
            ]);

            $toothName = $toothRecord->getToothName();
            $this->assertStringContainsString("Tooth #{$toothNumber}", $toothName);
        }
    }

    /**
     * Test get quadrant for tooth
     */
    public function test_get_quadrant(): void
    {
        // Test Upper Right Quadrant (1)
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'tooth_number' => 16,
        ]);
        $this->assertEquals(1, $toothRecord->getQuadrant());

        // Test Upper Left Quadrant (2)
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'tooth_number' => 26,
        ]);
        $this->assertEquals(2, $toothRecord->getQuadrant());

        // Test Lower Left Quadrant (3)
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'tooth_number' => 36,
        ]);
        $this->assertEquals(3, $toothRecord->getQuadrant());

        // Test Lower Right Quadrant (4)
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'tooth_number' => 46,
        ]);
        $this->assertEquals(4, $toothRecord->getQuadrant());
    }

    /**
     * Test needs review when date is past
     */
    public function test_needs_review_when_date_is_past(): void
    {
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'next_review_date' => now()->subDays(10),
        ]);

        $this->assertTrue($toothRecord->needsReview());
    }

    /**
     * Test does not need review when date is future
     */
    public function test_does_not_need_review_when_date_is_future(): void
    {
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'next_review_date' => now()->addDays(30),
        ]);

        $this->assertFalse($toothRecord->needsReview());
    }

    /**
     * Test does not need review when no date set
     */
    public function test_does_not_need_review_when_no_date_set(): void
    {
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'next_review_date' => null,
        ]);

        $this->assertFalse($toothRecord->needsReview());
    }

    /**
     * Test days until review - future date
     */
    public function test_days_until_review_for_future_date(): void
    {
        $futureDate = now()->addDays(30);
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'next_review_date' => $futureDate,
        ]);

        $daysUntil = $toothRecord->daysUntilReview();
        $this->assertTrue($daysUntil >= -30 && $daysUntil <= -29);
    }

    /**
     * Test days until review - past date
     */
    public function test_days_until_review_for_past_date(): void
    {
        $pastDate = now()->subDays(10);
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'next_review_date' => $pastDate,
        ]);

        $daysUntil = $toothRecord->daysUntilReview();
        $this->assertEquals(-10, $daysUntil);
    }

    /**
     * Test days until review when no date is set
     */
    public function test_days_until_review_null_when_no_date(): void
    {
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'next_review_date' => null,
        ]);

        $this->assertNull($toothRecord->daysUntilReview());
    }

    /**
     * Test mark as reviewed
     */
    public function test_mark_as_reviewed(): void
    {
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'next_review_date' => now()->subDays(10),
        ]);

        $this->assertTrue($toothRecord->needsReview());

        $toothRecord->markReviewed(180);

        $this->assertFalse($toothRecord->needsReview());
        $this->assertTrue($toothRecord->next_review_date->isFuture());
    }

    /**
     * Test mark as reviewed with custom days
     */
    public function test_mark_as_reviewed_with_custom_days(): void
    {
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'next_review_date' => now()->subDays(10),
        ]);

        $toothRecord->markReviewed(90);

        $expectedDate = now()->addDays(90);
        $this->assertTrue($toothRecord->next_review_date->diffInDays($expectedDate) <= 1);
    }

    /**
     * Test get history for a tooth
     */
    public function test_get_history_for_tooth(): void
    {
        // Create multiple records for same tooth
        ToothRecord::factory()->count(3)->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'tooth_number' => 16,
        ]);

        // Create record for different tooth
        ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'tooth_number' => 17,
        ]);

        $tooth16 = ToothRecord::where([
            'patient_id' => $this->patient->id,
            'tooth_number' => 16,
        ])->first();

        $history = $tooth16->getHistory();

        $this->assertCount(3, $history);
        foreach ($history as $record) {
            $this->assertEquals(16, $record->tooth_number);
            $this->assertEquals($this->patient->id, $record->patient_id);
        }
    }

    /**
     * Test by patient scope
     */
    public function test_by_patient_scope(): void
    {
        $patient2 = User::factory()->create();
        $patientRecord2 = PatientRecord::factory()->create(['patient_id' => $patient2->id]);

        ToothRecord::factory()->count(3)->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
        ]);

        ToothRecord::factory()->count(2)->create([
            'patient_id' => $patient2->id,
            'patient_record_id' => $patientRecord2->id,
        ]);

        $results = ToothRecord::byPatient($this->patient->id)->get();

        $this->assertCount(3, $results);
        foreach ($results as $record) {
            $this->assertEquals($this->patient->id, $record->patient_id);
        }
    }

    /**
     * Test by tooth scope
     */
    public function test_by_tooth_scope(): void
    {
        ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'tooth_number' => 16,
        ]);

        ToothRecord::factory()->count(2)->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'tooth_number' => 17,
        ]);

        $results = ToothRecord::byTooth(16)->get();

        $this->assertCount(1, $results);
        $this->assertEquals(16, $results->first()->tooth_number);
    }

    /**
     * Test by treatment scope
     */
    public function test_by_treatment_scope(): void
    {
        ToothRecord::factory()->count(2)->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'treatment_type' => 'Filling',
        ]);

        ToothRecord::factory()->count(3)->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'treatment_type' => 'Crown',
        ]);

        $results = ToothRecord::byTreatment('Filling')->get();

        $this->assertCount(2, $results);
        foreach ($results as $record) {
            $this->assertEquals('Filling', $record->treatment_type);
        }
    }

    /**
     * Test by status scope
     */
    public function test_by_status_scope(): void
    {
        ToothRecord::factory()->count(2)->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'tooth_status' => 'treated',
        ]);

        ToothRecord::factory()->count(3)->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'tooth_status' => 'extracted',
        ]);

        $results = ToothRecord::byStatus('treated')->get();

        $this->assertCount(2, $results);
        foreach ($results as $record) {
            $this->assertEquals('treated', $record->tooth_status);
        }
    }

    /**
     * Test needing review scope
     */
    public function test_needing_review_scope(): void
    {
        // Create teeth that need review (past review date)
        ToothRecord::factory()->count(2)->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'next_review_date' => now()->subDays(5),
            'tooth_status' => 'treated',
        ]);

        // Create teeth that don't need review (future review date)
        ToothRecord::factory()->count(3)->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'next_review_date' => now()->addDays(30),
        ]);

        // Create extracted tooth that needs review (should not be included)
        ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'next_review_date' => now()->subDays(5),
            'tooth_status' => 'extracted',
        ]);

        $results = ToothRecord::needingReview()->get();

        $this->assertCount(2, $results);
        foreach ($results as $record) {
            $this->assertNotEquals('extracted', $record->tooth_status);
            $this->assertTrue($record->next_review_date->isPast());
        }
    }

    /**
     * Test materials used is cast as array
     */
    public function test_materials_used_cast_as_array(): void
    {
        $materials = ['Composite Resin', 'Bonding Agent', 'Etching Solution'];

        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'materials_used' => $materials,
        ]);

        $this->assertIsArray($toothRecord->materials_used);
        $this->assertCount(3, $toothRecord->materials_used);
        $this->assertEquals($materials, $toothRecord->materials_used);
    }

    /**
     * Test treatment date is cast as datetime
     */
    public function test_treatment_date_cast_as_datetime(): void
    {
        $treatmentDate = now();
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'treatment_date' => $treatmentDate,
        ]);

        $this->assertInstanceOf(Carbon::class, $toothRecord->treatment_date);
    }

    /**
     * Test next review date is cast as datetime
     */
    public function test_next_review_date_cast_as_datetime(): void
    {
        $reviewDate = now()->addMonths(6);
        $toothRecord = ToothRecord::factory()->create([
            'patient_id' => $this->patient->id,
            'patient_record_id' => $this->patientRecord->id,
            'next_review_date' => $reviewDate,
        ]);

        $this->assertInstanceOf(Carbon::class, $toothRecord->next_review_date);
    }

    /**
     * Test tooth record with all statuses
     */
    public function test_tooth_statuses(): void
    {
        $statuses = ['healthy', 'treatment_needed', 'treated', 'extracted', 'missing', 'implant'];

        foreach ($statuses as $status) {
            $toothRecord = ToothRecord::factory()->create([
                'patient_id' => $this->patient->id,
                'patient_record_id' => $this->patientRecord->id,
                'tooth_status' => $status,
            ]);

            $this->assertEquals($status, $toothRecord->tooth_status);
        }
    }

    /**
     * Test tooth record with different treatment types
     */
    public function test_different_treatment_types(): void
    {
        $treatments = ['Filling', 'Crown', 'Root Canal', 'Extraction', 'Cleaning', 'Bleaching'];

        foreach ($treatments as $treatment) {
            $toothRecord = ToothRecord::factory()->create([
                'patient_id' => $this->patient->id,
                'patient_record_id' => $this->patientRecord->id,
                'treatment_type' => $treatment,
            ]);

            $this->assertEquals($treatment, $toothRecord->treatment_type);
        }
    }
}
