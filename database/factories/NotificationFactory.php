<?php

namespace Database\Factories;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Notification>
 */
class NotificationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => $this->faker->sentence(),
            'message' => $this->faker->paragraph(),
            'type' => $this->faker->randomElement(['appointment', 'reminder', 'treatment', 'system']),
            'is_read' => false,
            'read_at' => null,
        ];
    }

    /**
     * Indicate that the notification should be read.
     */
    public function read(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_read' => true,
            'read_at' => now(),
        ]);
    }

    /**
     * Set notification type to appointment.
     */
    public function appointment(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'appointment',
        ]);
    }

    /**
     * Set notification type to payment.
     */
    public function payment(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'payment',
        ]);
    }

    /**
     * Set notification type to system.
     */
    public function system(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'system',
        ]);
    }

    /**
     * Set notification type to message.
     */
    public function message(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'message',
        ]);
    }
}
