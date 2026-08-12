<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\Appointment;

class AppointmentUpdatedMail extends Mailable
{
    use SerializesModels;

    public Appointment $appointment;
    public array $changes;

    public function __construct(Appointment $appointment, array $changes)
    {
        $this->appointment = $appointment;
        $this->changes = $changes;
    }

    /**
     * Format appointment status for display in email
     */
    private function formatStatusForEmail(string $status): string
    {
        $statusMap = [
            'pending_confirmation' => 'Pending Confirmation',
            'scheduled' => 'Scheduled',
            'confirmed' => 'Confirmed',
            'checked_in' => 'Checked In',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
            'no_show' => 'No Show',
            'not_available' => 'Not Available',
        ];

        return $statusMap[$status] ?? ucfirst(str_replace('_', ' ', $status));
    }

    public function build()
    {
        $appointment = $this->appointment->load(['patient', 'doctor', 'service']);
        $displayStatus = $this->formatStatusForEmail($appointment->status);

        return $this->from(config('mail.from.address'), config('mail.from.name'))
            ->subject('Appointment Updated')
            ->markdown('emails.appointment-updated', [
                'appointment' => $appointment,
                'patient' => $appointment->patient,
                'doctor' => $appointment->doctor,
                'service' => $appointment->service,
                'changes' => $this->changes,
                'displayStatus' => $displayStatus,
            ]);
    }
}

