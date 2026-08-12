<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Appointment;
use App\Models\Notification;

$appointment = Appointment::where('status', 'scheduled')->orderBy('created_at','desc')->first();
if (!$appointment) {
    echo "No scheduled appointment found to confirm.\n";
    exit(1);
}

$appointment->update(['status' => 'confirmed']);

$message = "Your appointment with Dr. {$appointment->doctor->name} on " .
            (function($a){
                try{
                    $date = $a->appointment_date ? \Carbon\Carbon::parse($a->appointment_date) : null;
                    $timeParts = explode(':', $a->appointment_time);
                    $time = \Carbon\Carbon::createFromTime((int)($timeParts[0] ?? 0),(int)($timeParts[1] ?? 0),(int)($timeParts[2] ?? 0));
                    return $date->format('M d, Y') . ' at ' . $time->format('g:i A');
                } catch (\Exception $ex) {
                    return $a->appointment_date . ' ' . $a->appointment_time;
                }
            })($appointment)
            . " has been confirmed.";

Notification::createAppointmentNotification(
    $appointment->patient_id,
    'Appointment Confirmed',
    $message
);

echo "Appointment {$appointment->id} marked confirmed and notification created.\n";