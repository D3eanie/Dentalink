<?php

namespace App\Observers;

use App\Models\Appointment;
use App\Models\Patient;

class AppointmentObserver
{
    /**
     * Handle the Appointment "created" event.
     */
    public function created(Appointment $appointment): void
    {
        // Update patient's last_appointment_date when appointment is scheduled
        if ($appointment->status === 'scheduled' || $appointment->status === 'confirmed') {
            $patient = Patient::where('user_id', $appointment->patient_id)->first();
            if ($patient) {
                $patient->updateLastAppointment();
            }
        }
    }

    /**
     * Handle the Appointment "updated" event.
     */
    public function updated(Appointment $appointment): void
    {
        // Update patient's last_appointment_date when appointment is confirmed
        if ($appointment->status === 'confirmed') {
            $patient = Patient::where('user_id', $appointment->patient_id)->first();
            if ($patient) {
                $patient->updateLastAppointment();
            }
        }

        // Also update if appointment is completed
        if ($appointment->status === 'completed') {
            $patient = Patient::where('user_id', $appointment->patient_id)->first();
            if ($patient) {
                $patient->updateLastAppointment();
            }
        }
    }

    /**
     * Handle the Appointment "deleted" event.
     */
    public function deleted(Appointment $appointment): void
    {
        // Could recalculate based on remaining appointments if needed
        // For now, just leave it as is
    }
}
