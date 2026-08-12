<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\ToothRecord;
use App\Models\User;

try {
    // Get any two users
    $users = User::limit(2)->get();

    if ($users->count() < 2) {
        echo "Error: Need at least 2 users in database. Found: " . $users->count() . "\n";
        echo "Available users:\n";
        User::all()->each(function($u) {
            echo "- {$u->name} (ID: {$u->id}, Role: {$u->role})\n";
        });
        exit(1);
    }

    $patient = $users->first();
    $doctor = $users->last();

    echo "Creating test tooth records...\n";
    echo "Patient: {$patient->name} (ID: {$patient->id})\n";
    echo "Doctor: {$doctor->name} (ID: {$doctor->id})\n\n";

    // Create several test records
    $services = ['Cleaning', 'Filling', 'Root Canal', 'Extraction', 'Crown', 'Scaling'];
    $toothNumbers = [11, 12, 13, 14, 21, 22, 31, 32, 41, 42];

    foreach ($toothNumbers as $index => $tooth) {
        $record = ToothRecord::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'tooth_number' => $tooth,
            'service' => $services[$index % count($services)],
            'date_done' => now()->subDays(rand(1, 30))->toDateString(),
            'notes' => "Test record for tooth #{$tooth}"
        ]);
        echo "✓ Created record for Tooth #{$tooth} - Service: {$record->service}\n";
    }

    echo "\n✓ Successfully created " . count($toothNumbers) . " test records!\n";

} catch (\Exception $e) {
    echo "Error: {$e->getMessage()}\n";
    echo "Stack: " . $e->getTraceAsString() . "\n";
    exit(1);
}
?>
