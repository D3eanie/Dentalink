<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$appointment = \App\Models\Appointment::latest()->first();

if (!$appointment) {
    echo "No appointments found\n";
    exit;
}

echo "=== Appointment Date Debug ===\n";
echo "ID: " . $appointment->id . "\n";
echo "Raw DB Value: " . $appointment->getRawOriginal('appointment_date') . "\n";
echo "Casted Value: " . $appointment->appointment_date . "\n";
echo "Type: " . gettype($appointment->appointment_date) . "\n";
echo "To ISO String: " . $appointment->appointment_date->toISOString() . "\n";
echo "To Date String: " . $appointment->appointment_date->toDateString() . "\n";
echo "Format Y-m-d: " . $appointment->appointment_date->format('Y-m-d') . "\n";
echo "\n=== JSON Serialization ===\n";
echo json_encode(['appointment_date' => $appointment->appointment_date], JSON_PRETTY_PRINT) . "\n";
echo "\n=== Full Model toArray() ===\n";
$array = $appointment->toArray();
echo "appointment_date from toArray(): " . $array['appointment_date'] . "\n";
echo "\n=== Full Model JSON ===\n";
echo json_encode($appointment, JSON_PRETTY_PRINT) . "\n";
