<?php

require_once __DIR__ . '/../bootstrap/app.php';

use App\Models\Appointment;
use Illuminate\Support\Facades\Log;

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Http\Kernel');
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

// Get a completed appointment with financial records
$appointment = Appointment::with(['financialRecords', 'patient', 'doctor', 'service'])
    ->where('status', 'completed')
    ->first();

if (!$appointment) {
    echo "No completed appointments found\n";
    exit(1);
}

echo "=== Appointment ID: " . $appointment->id . " ===\n";
echo "Status: " . $appointment->status . "\n";
echo "Balance attribute: " . $appointment->balance . "\n";
echo "Balance from DB: " . $appointment->getAttributes()['balance'] . "\n";
echo "Financial Records count: " . count($appointment->financialRecords) . "\n";

if (count($appointment->financialRecords) > 0) {
    foreach ($appointment->financialRecords as $record) {
        echo "  - Record ID: " . $record->id . ", Balance: " . $record->balance . ", Created: " . $record->created_at . "\n";
    }

    $latestRecord = $appointment->financialRecords->sortByDesc('created_at')->first();
    echo "Latest Record Balance: " . $latestRecord->balance . "\n";
}

echo "\n=== What would be sent in Inertia response ===\n";
$mappedData = [
    'id' => $appointment->id,
    'patient_id' => $appointment->patient_id,
    'doctor_id' => $appointment->doctor_id,
    'service_id' => $appointment->service_id,
    'appointment_date' => $appointment->appointment_date,
    'appointment_time' => $appointment->appointment_time,
    'duration_minutes' => $appointment->duration_minutes,
    'status' => $appointment->status,
    'balance' => $appointment->balance,
    'notes' => $appointment->notes,
    'checked_in_at' => $appointment->checked_in_at,
    'created_at' => $appointment->created_at,
    'updated_at' => $appointment->updated_at,
    'patient' => $appointment->patient,
    'doctor' => $appointment->doctor,
    'service' => $appointment->service,
    'financial_records' => $appointment->financialRecords,
];

echo json_encode($mappedData, JSON_PRETTY_PRINT);
