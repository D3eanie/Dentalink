<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\Appointment;

class AppointmentSlotTakenMail extends Mailable
{
    use SerializesModels;

    public Appointment $appointment;
    public string $takenAt;

    public function __construct(Appointment $appointment, string $takenAt)
    {
        $this->appointment = $appointment;
        $this->takenAt = $takenAt;
    }

    public function build()
    {
        $appointment = $this->appointment->load(['patient', 'doctor', 'service']);

        return $this->from(config('mail.from.address'), config('mail.from.name'))
                    ->subject('⏰ Appointment Slot No Longer Available')
                    ->markdown('emails.appointment-slot-taken', [
                        'appointment' => $appointment,
                        'doctor' => $appointment->doctor,
                        'service' => $appointment->service,
                        'takenAt' => $this->takenAt,
                    ]);
    }
}
