<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Appointment;
use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CheckDelayedAppointments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:check-delays';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for delayed appointments and notify next patients';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $now = Carbon::now();
        $notifiedCount = 0;

        // Get all appointments that are currently in progress (not_available status)
        // and have exceeded their expected end time
        $delayedAppointments = Appointment::where('status', 'not_available')
            ->whereDate('appointment_date', today())
            ->with(['patient', 'doctor', 'service'])
            ->get()
            ->filter(function ($appointment) use ($now) {
                $expectedEndTime = Carbon::createFromFormat('H:i:s', $appointment->appointment_time)
                    ->addMinutes($appointment->duration_minutes);
                
                // Check if appointment has exceeded expected end time by at least 5 minutes
                return $now->greaterThan($expectedEndTime->addMinutes(5));
            });

        foreach ($delayedAppointments as $appointment) {
            // Find the next appointment for the same doctor
            $nextAppointment = Appointment::where('doctor_id', $appointment->doctor_id)
                ->whereDate('appointment_date', $appointment->appointment_date)
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->whereTime('appointment_time', '>', $appointment->appointment_time)
                ->orderBy('appointment_time')
                ->first();

            if ($nextAppointment && $nextAppointment->patient) {
                // Calculate delay
                $expectedEnd = Carbon::createFromFormat('H:i:s', $appointment->appointment_time)
                    ->addMinutes($appointment->duration_minutes);
                $delayMinutes = $now->diffInMinutes($expectedEnd);

                // Check if we've already notified for this delay (avoid spam)
                $existingNotification = Notification::where('user_id', $nextAppointment->patient_id)
                    ->where('type', 'appointment_delay')
                    ->where('created_at', '>=', $now->subMinutes(15)) // Within last 15 minutes
                    ->first();

                if (!$existingNotification) {
                    try {
                        Notification::create([
                            'user_id' => $nextAppointment->patient_id,
                            'type' => 'appointment_delay',
                            'title' => 'Appointment Delay Notice',
                            'message' => "Dr. {$appointment->doctor->name}'s current appointment is running approximately {$delayMinutes} minutes behind schedule. Your appointment at {$nextAppointment->formatted_time} may be delayed. We apologize for any inconvenience.",
                            'is_read' => false,
                        ]);

                        $notifiedCount++;
                        Log::info('Notified patient about appointment delay', [
                            'next_appointment_id' => $nextAppointment->id,
                            'delayed_appointment_id' => $appointment->id,
                            'delay_minutes' => $delayMinutes,
                        ]);
                    } catch (\Exception $e) {
                        Log::error('Failed to notify patient about appointment delay', [
                            'next_appointment_id' => $nextAppointment->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }
        }

        if ($notifiedCount > 0) {
            $this->info("Notified {$notifiedCount} patient(s) about appointment delays.");
        } else {
            $this->info('No delayed appointments found or notifications needed.');
        }

        return 0;
    }
}

