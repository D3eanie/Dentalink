<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Appointment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PatientRecord>
 */
class PatientRecordFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_id' => User::factory(),
            'appointment_id' => Appointment::factory(),
            'treatment_notes' => fake()->text(),
            'diagnosis' => fake()->sentence(),
            'procedures_performed' => [fake()->word(), fake()->word()],
            'recommendations' => fake()->sentence(),
            'follow_up_instructions' => fake()->sentence(),
            'created_by' => User::factory(),
        ];
    }
}
