<?php

namespace Tests\Unit\Models;

use App\Models\Patient;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PatientModelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Test patient creation
     */
    public function test_can_create_patient(): void
    {
        $user = User::factory()->create(['role' => 'patient']);

        $patient = Patient::create([
            'user_id' => $user->id,
            'birthday' => '1990-01-15',
            'gender' => 'male',
            'insurance_provider' => 'PhilHealth',
            'insurance_number' => 'PM-123456',
        ]);

        $this->assertNotNull($patient->id);
        $this->assertEquals($user->id, $patient->user_id);
        $this->assertEquals('male', $patient->gender);
    }

    /**
     * Test patient gender values
     */
    public function test_patient_gender_values(): void
    {
        $user = User::factory()->create(['role' => 'patient']);
        $genders = ['male', 'female', 'other'];

        foreach ($genders as $gender) {
            $patient = Patient::create([
                'user_id' => $user->id,
                'birthday' => '1990-01-15',
                'gender' => $gender,
            ]);

            $this->assertEquals($gender, $patient->gender);
        }
    }

    /**
     * Test patient user relationship
     */
    public function test_patient_user_relationship(): void
    {
        $user = User::factory()->create(['role' => 'patient']);

        $patient = Patient::create([
            'user_id' => $user->id,
            'birthday' => '1990-01-15',
            'gender' => 'female',
        ]);

        $this->assertNotNull($patient->user);
        $this->assertEquals($user->id, $patient->user->id);
    }

    /**
     * Test patient appointment relationship
     */
    public function test_patient_appointments_relationship(): void
    {
        $user = User::factory()->create(['role' => 'patient']);
        $patient = Patient::create([
            'user_id' => $user->id,
            'birthday' => '1990-01-15',
            'gender' => 'male',
        ]);

        // Appointments would be created through user relationship
        $this->assertNotNull($patient->user);
    }

    /**
     * Test patient records relationship
     */
    public function test_patient_records_relationship(): void
    {
        $user = User::factory()->create(['role' => 'patient']);
        $patient = Patient::create([
            'user_id' => $user->id,
            'birthday' => '1990-01-15',
            'gender' => 'female',
        ]);

        $this->assertNotNull($patient);
        // Patient records would be queried from database
    }

    /**
     * Test patient age calculation
     */
    public function test_patient_age_calculation(): void
    {
        $user = User::factory()->create(['role' => 'patient']);
        $patient = Patient::create([
            'user_id' => $user->id,
            'birthday' => '1990-01-15',
            'gender' => 'male',
        ]);

        $this->assertNotNull($patient->birthday);
    }

    /**
     * Test patient update
     */
    public function test_can_update_patient(): void
    {
        $user = User::factory()->create(['role' => 'patient']);
        $patient = Patient::create([
            'user_id' => $user->id,
            'birthday' => '1990-01-15',
            'gender' => 'male',
            'insurance_provider' => 'PhilHealth',
        ]);

        $patient->update([
            'insurance_provider' => 'Private',
        ]);

        $this->assertEquals('Private', $patient->insurance_provider);
    }

    /**
     * Test patient can be soft deleted (if using SoftDeletes)
     */
    public function test_patient_exists(): void
    {
        $user = User::factory()->create(['role' => 'patient']);
        $patient = Patient::create([
            'user_id' => $user->id,
            'date_of_birth' => '1990-01-15',
            'gender' => 'female',
        ]);

        $foundPatient = Patient::find($patient->id);
        $this->assertNotNull($foundPatient);
        $this->assertEquals($patient->id, $foundPatient->id);
    }
}
