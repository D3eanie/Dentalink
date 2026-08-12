<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Appointment;
use App\Models\Notification;
use App\Mail\NotificationMail;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AutoCancelNoShowAppointments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:auto-cancel-no-show';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Auto-cancel appointments 15 minutes after scheduled time if not checked in';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = now();
        $cancelledCount = 0;

        $appointments = Appointment::whereIn('status', ['scheduled', 'confirmed'])
            ->whereDate('appointment_date', '<=', $now->toDateString())
            ->whereNull('checked_in_at')
            ->with(['patient', 'doctor', 'service'])
            ->get();

        foreach ($appointments as $appointment) {
            $dateString = $appointment->appointment_date->format('Y-m-d');
            $timeString = $appointment->appointment_time;
            $timeString = strlen($timeString) === 5 ? $timeString . ':00' : $timeString;

            try {
                $scheduledDateTime = Carbon::createFromFormat('Y-m-d H:i:s', $dateString . ' ' . $timeString);
            } catch (\Exception $e) {
                Log::warning('Auto-cancel skipped: invalid appointment time', [
                    'appointment_id' => $appointment->id,
                    'date' => $dateString,
                    'time' => $timeString,
                    'error' => $e->getMessage(),
                ]);
                continue;
            }

            if ($now->lessThanOrEqualTo($scheduledDateTime->copy()->addMinutes(15))) {
                continue;
            }

            $notes = trim((string) $appointment->notes);
            $cancelReason = 'Auto-cancelled: Not checked in within 15 minutes after appointment time.';
            $appointment->update([
                'status' => 'cancelled',
                'notes' => $notes !== '' ? $notes . "\n" . $cancelReason : $cancelReason,
            ]);

            $cancelledCount++;

            if ($appointment->patient && $appointment->patient->email) {
                try {
                    $formattedTime = $scheduledDateTime->format('g:i A');
                    $formattedDate = $scheduledDateTime->format('M d, Y');
                    $doctorName = $appointment->doctor?->name ?? 'your doctor';
                    $serviceName = $appointment->service?->name ?? 'your appointment';

                    $notification = Notification::createAppointmentNotification(
                        $appointment->patient_id,
                        'Appointment Auto-Cancelled (No Check-In)',
                        "Your {$serviceName} appointment with Dr. {$doctorName} on {$formattedDate} at {$formattedTime} was automatically cancelled because you did not check in within 15 minutes of the scheduled time."
                    );

                    Mail::to($appointment->patient->email)->send(new NotificationMail($notification));
                } catch (\Exception $e) {
                    Log::error('Failed to send auto-cancel email', [
                        'appointment_id' => $appointment->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        $this->info("Auto-cancelled {$cancelledCount} appointment(s) for no check-in.");
        return 0;
    }
}
