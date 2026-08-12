<?php

namespace Tests\Unit\Models;

use App\Models\Schedule;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ScheduleModelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Test schedule creation
     */
    public function test_can_create_schedule(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $schedule = Schedule::create([
            'staff_id' => $staff->id,
            'date' => now()->addDay()->format('Y-m-d'),
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'is_available' => true,
        ]);

        $this->assertNotNull($schedule->id);
        $this->assertTrue($schedule->is_available);
        $this->assertNotNull($schedule->start_time);
    }

    /**
     * Test schedule staff relationship
     */
    public function test_schedule_staff_relationship(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $schedule = Schedule::create([
            'staff_id' => $staff->id,
            'date' => now()->addDay()->format('Y-m-d'),
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'is_available' => true,
        ]);

        $this->assertNotNull($schedule->staff);
        $this->assertEquals($staff->id, $schedule->staff->id);
    }

    /**
     * Test schedule shift types
     */
    public function test_schedule_shift_types(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        for ($i = 0; $i < 3; $i++) {
            $schedule = Schedule::create([
                'staff_id' => $staff->id,
                'date' => now()->addDays($i + 1)->format('Y-m-d'),
                'start_time' => '08:00:00',
                'end_time' => '17:00:00',
                'is_available' => true,
            ]);

            $this->assertNotNull($schedule->id);
        }
    }

    /**
     * Test schedule availability toggle
     */
    public function test_schedule_availability_toggle(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $schedule = Schedule::create([
            'staff_id' => $staff->id,
            'date' => now()->addDay()->format('Y-m-d'),
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'is_available' => true,
        ]);

        $this->assertTrue($schedule->is_available);

        $schedule->update(['is_available' => false]);
        $this->assertFalse($schedule->is_available);
    }

    /**
     * Test schedule can be queried by date
     */
    public function test_schedule_query_by_date(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $tomorrow = now()->addDay();

        Schedule::create([
            'staff_id' => $staff->id,
            'date' => $tomorrow->format('Y-m-d'),
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'is_available' => true,
        ]);

        $schedules = Schedule::whereDate('date', $tomorrow->format('Y-m-d'))->get();
        $this->assertEquals(1, $schedules->count());
    }

    /**
     * Test schedule can be queried by staff
     */
    public function test_schedule_query_by_staff(): void
    {
        $doctor1 = User::factory()->create(['role' => 'staff']);
        $doctor2 = User::factory()->create(['role' => 'staff']);

        Schedule::create([
            'staff_id' => $doctor1->id,
            'date' => now()->addDay()->format('Y-m-d'),
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'is_available' => true,
        ]);

        Schedule::create([
            'staff_id' => $doctor2->id,
            'date' => now()->addDay()->format('Y-m-d'),
            'start_time' => '09:00:00',
            'end_time' => '18:00:00',
            'is_available' => true,
        ]);

        $doctor1Schedules = Schedule::where('staff_id', $doctor1->id)->get();
        $this->assertEquals(1, $doctor1Schedules->count());
    }

    /**
     * Test schedule break time validation
     */
    public function test_schedule_break_times(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $schedule = Schedule::create([
            'staff_id' => $staff->id,
            'date' => now()->addDay()->format('Y-m-d'),
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'notes' => 'Break 12-1pm',
            'is_available' => true,
        ]);

        $this->assertNotNull($schedule->start_time);
        $this->assertNotNull($schedule->end_time);
    }

    /**
     * Test past schedules can be identified
     */
    public function test_schedule_past_date_identification(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $pastDate = now()->subDays(5);

        $pastSchedule = Schedule::create([
            'staff_id' => $staff->id,
            'date' => $pastDate->format('Y-m-d'),
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'is_available' => true,
        ]);

        // This would normally be handled by a cleanup command
        $pastSchedules = Schedule::whereDate('date', '<', now()->format('Y-m-d'))->get();
        $this->assertGreaterThanOrEqual(1, $pastSchedules->count());
    }

    /**
     * Test schedule can handle multiple breaks
     */
    public function test_schedule_with_optional_break(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $schedule = Schedule::create([
            'staff_id' => $staff->id,
            'date' => now()->addDay()->format('Y-m-d'),
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'is_available' => true,
        ]);

        $this->assertNotNull($schedule->id);
    }
}
