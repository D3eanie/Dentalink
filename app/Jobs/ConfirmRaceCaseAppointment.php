<?php

namespace App\Jobs;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ConfirmRaceCaseAppointment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $appointmentId;
    public int $tries = 3;
    public int $timeout = 30;

    /**
     * Create a new job instance.
     */
    public function __construct(int $appointmentId)
    {
        $this->appointmentId = $appointmentId;
    }

    /**
     * Execute the job.
     *
     * This job confirms the first appointment in a race case after 2 minutes,
     * and rejects all other appointments that raced for the same slot.
     *
     * NOTE: Emails are now sent IMMEDIATELY in AppointmentController, not here.
     * This job only handles the database state changes.
     */
    public function handle(): void
    {
        try {
            $appointment = Appointment::find($this->appointmentId);

            if (!$appointment) {
                Log::warning("Race case confirmation job: Appointment {$this->appointmentId} not found");
                return;
            }

            // If already confirmed, skip
            if ($appointment->status === 'confirmed') {
                Log::info("Appointment {$this->appointmentId} already confirmed, skipping");
                return;
            }

            // If it's been cancelled, skip
            if ($appointment->status === 'cancelled') {
                Log::info("Appointment {$this->appointmentId} was cancelled, skipping confirmation");
                return;
            }

            // Check if there are any earlier confirmed appointments for the same slot
            $confirmedAppointment = Appointment::where('doctor_id', $appointment->doctor_id)
                ->whereDate('appointment_date', $appointment->appointment_date)
                ->where('appointment_time', $appointment->appointment_time)
                ->where('status', 'confirmed')
                ->first();

            if ($confirmedAppointment) {
                // Another patient already has this slot confirmed, reject this one
                Log::info("Appointment {$this->appointmentId} lost race - slot already confirmed by {$confirmedAppointment->id}");

                $appointment->update([
                    'status' => 'cancelled',
                ]);

                // Email already sent immediately in controller, no need to send again
                Log::info("Race case rejection: Appointment {$appointment->id} automatically cancelled (lost race)");
                return;
            }

            // Check if this is the earliest request for this slot
            $earlierAppointments = Appointment::where('doctor_id', $appointment->doctor_id)
                ->whereDate('appointment_date', $appointment->appointment_date)
                ->where('appointment_time', $appointment->appointment_time)
                ->where('status', 'pending_confirmation')
                ->where('id', '!=', $appointment->id)
                ->where('created_at', '<', $appointment->created_at)
                ->first();

            if ($earlierAppointments) {
                // This appointment is not the earliest, reject it
                Log::info("Appointment {$this->appointmentId} is not first in race, cancelling");

                $appointment->update([
                    'status' => 'cancelled',
                ]);

                // Email already sent immediately in controller
                Log::info("Race case rejection: Appointment {$appointment->id} cancelled (not first)");
                return;
            }

            // This is the winner! Confirm the appointment
            $appointment->update([
                'status' => 'confirmed',
                'booking_confirmed_at' => now(),
            ]);

            Log::info("Race case confirmed: Appointment {$appointment->id} won the race for slot {$appointment->appointment_date} {$appointment->appointment_time}");

            // Cancel all other pending appointments for the same slot
            $otherAppointments = Appointment::where('doctor_id', $appointment->doctor_id)
                ->whereDate('appointment_date', $appointment->appointment_date)
                ->where('appointment_time', $appointment->appointment_time)
                ->where('status', 'pending_confirmation')
                ->where('id', '!=', $appointment->id)
                ->get();

            foreach ($otherAppointments as $otherAppointment) {
                $otherAppointment->update([
                    'status' => 'cancelled',
                ]);

                // Emails already sent immediately, no need to send again
                Log::info("Race case: Automatically cancelled loser appointment {$otherAppointment->id}");
            }

        } catch (\Exception $e) {
            Log::error("Error in ConfirmRaceCaseAppointment job: " . $e->getMessage(), [
                'appointment_id' => $this->appointmentId,
                'exception' => $e,
            ]);
            throw $e;
        }
    }
}
