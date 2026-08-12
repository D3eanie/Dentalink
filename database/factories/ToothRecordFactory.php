<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\PatientRecord;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ToothRecord>
 */
class ToothRecordFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_record_id' => PatientRecord::factory(),
            'patient_id' => User::factory(),
            'doctor_id' => User::factory(),
            'tooth_number' => fake()->numberBetween(11, 48),
            'tooth_position' => 'Upper Right',
            'surface' => fake()->randomElement(['Occlusal', 'Mesial', 'Distal', 'Buccal', 'Lingual']),
            'service' => fake()->randomElement(['Filling', 'Crown', 'Root Canal', 'Cleaning', 'Extraction']),
            'treatment_type' => fake()->randomElement(['Filling', 'Crown', 'Root Canal', 'Cleaning']),
            'treatment_description' => fake()->sentence(),
            'material_type' => fake()->randomElement(['Amalgam', 'Composite', 'Porcelain']),
            'materials_used' => [fake()->word(), fake()->word()],
            'tooth_status' => fake()->randomElement(['healthy', 'treatment_needed', 'treated', 'extracted']),
            'tooth_condition' => fake()->randomElement(['intact', 'decay', 'crack', 'wear']),
            'clinical_notes' => fake()->sentence(),
            'date_done' => now(),
            'treatment_date' => now(),
            'next_review_date' => now()->addMonths(6),
        ];
    }
}
