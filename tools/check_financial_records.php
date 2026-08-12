<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\FinancialRecord;

echo "Checking Financial Records:\n";
echo "==========================\n\n";

$records = FinancialRecord::with('appointment.service')->get();

echo "Total Records: " . $records->count() . "\n\n";

foreach ($records as $record) {
    echo "Record ID: {$record->id}\n";
    echo "  Payment Status: {$record->payment_status}\n";
    echo "  Amount: {$record->amount}\n";
    echo "  Appointment ID: " . ($record->appointment_id ?? 'NULL') . "\n";

    if ($record->appointment) {
        echo "  Appointment exists: YES (ID: {$record->appointment->id})\n";
        echo "  Service ID: " . ($record->appointment->service_id ?? 'NULL') . "\n";

        if ($record->appointment->service) {
            echo "  Service exists: YES (Name: {$record->appointment->service->name}, Price: {$record->appointment->service->price})\n";
        } else {
            echo "  Service exists: NO (NULL)\n";
        }
    } else {
        echo "  Appointment exists: NO (NULL)\n";
    }

    echo "\n";
}
