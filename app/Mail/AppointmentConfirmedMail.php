<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\Appointment;

class AppointmentConfirmedMail extends Mailable
{
    use SerializesModels;

    public Appointment $appointment;

    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment;
    }

    public function build()
    {
        $appointment = $this->appointment->load(['patient', 'doctor', 'service']);

        return $this->from(config('mail.from.address'), config('mail.from.name'))
                    ->subject('✓ Your Appointment Has Been Confirmed')
                    ->markdown('emails.appointment-confirmed', [
                        'appointment' => $appointment,
                        'patient' => $appointment->patient,
                        'doctor' => $appointment->doctor,
                        'service' => $appointment->service,
                    ]);
    }
}
