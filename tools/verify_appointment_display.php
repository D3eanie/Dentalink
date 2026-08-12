<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Appointment Display Verification ===\n\n";

$appointment = \App\Models\Appointment::latest()->first();

if (!$appointment) {
    echo "No appointments found\n";
    exit;
}

echo "Appointment ID: {$appointment->id}\n";
echo "Patient: {$appointment->patient->name}\n";
echo "Doctor: Dr. {$appointment->doctor->name}\n\n";

echo "=== Database Storage ===\n";
echo "Raw appointment_date: {$appointment->getRawOriginal('appointment_date')}\n";
echo "Raw appointment_time: {$appointment->appointment_time}\n\n";

echo "=== JSON API Response (what frontend receives) ===\n";
$json = json_decode(json_encode($appointment), true);
echo "appointment_date: {$json['appointment_date']}\n";
echo "appointment_time: {$json['appointment_time']}\n\n";

echo "=== Expected Display ===\n";
// Parse date in local time (no timezone conversion)
$dateParts = explode('-', $json['appointment_date']);
$year = (int)$dateParts[0];
$month = (int)$dateParts[1];
$day = (int)$dateParts[2];
$dateObj = new DateTime();
$dateObj->setDate($year, $month, $day);
$dateObj->setTime(0, 0, 0);

echo "Date (long format): " . $dateObj->format('F d, Y') . "\n";
echo "Date (short format): " . $dateObj->format('M d, Y') . "\n\n";

// Time format
$timeParts = explode(':', $json['appointment_time']);
$hours = (int)$timeParts[0];
$minutes = (int)$timeParts[1];
$timeObj = new DateTime();
$timeObj->setTime($hours, $minutes);
echo "Time: " . $timeObj->format('g:i A') . "\n\n";

echo "✓ Frontend should display: {$dateObj->format('F d, Y')} at {$timeObj->format('g:i A')}\n";
echo "✓ NOT the day before!\n";
