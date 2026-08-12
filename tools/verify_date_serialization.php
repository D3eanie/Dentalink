<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Date Serialization Verification ===\n\n";

// Test Appointment model
$appointment = \App\Models\Appointment::latest()->first();
if ($appointment) {
    $json = json_decode(json_encode($appointment), true);
    echo "✓ Appointment (ID {$appointment->id}):\n";
    echo "  appointment_date: {$json['appointment_date']}\n";
    echo "  Expected format: YYYY-MM-DD (no time component)\n";
    echo "  Pass: " . (preg_match('/^\d{4}-\d{2}-\d{2}$/', $json['appointment_date']) ? "YES ✓" : "NO ✗") . "\n\n";
}

// Test Schedule model
$schedule = \App\Models\Schedule::latest()->first();
if ($schedule) {
    $json = json_decode(json_encode($schedule), true);
    echo "✓ Schedule (ID {$schedule->id}):\n";
    echo "  date: {$json['date']}\n";
    echo "  Expected format: YYYY-MM-DD (no time component)\n";
    echo "  Pass: " . (preg_match('/^\d{4}-\d{2}-\d{2}$/', $json['date']) ? "YES ✓" : "NO ✗") . "\n\n";
}

// Test TreatmentPlan model
$treatmentPlan = \App\Models\TreatmentPlan::whereNotNull('start_date')->latest()->first();
if ($treatmentPlan) {
    $json = json_decode(json_encode($treatmentPlan), true);
    echo "✓ TreatmentPlan (ID {$treatmentPlan->id}):\n";
    echo "  start_date: {$json['start_date']}\n";
    echo "  Expected format: YYYY-MM-DD (no time component)\n";
    echo "  Pass: " . (preg_match('/^\d{4}-\d{2}-\d{2}$/', $json['start_date']) ? "YES ✓" : "NO ✗") . "\n\n";
}

// Test User model (Staff with hire_date)
$staff = \App\Models\User::where('role', 'staff')->whereNotNull('hire_date')->first();
if ($staff) {
    $json = json_decode(json_encode($staff), true);
    echo "✓ User/Staff (ID {$staff->id}):\n";
    if (isset($json['hire_date'])) {
        echo "  hire_date: {$json['hire_date']}\n";
        echo "  Expected format: YYYY-MM-DD (no time component)\n";
        echo "  Pass: " . (preg_match('/^\d{4}-\d{2}-\d{2}$/', $json['hire_date']) ? "YES ✓" : "NO ✗") . "\n";
    }
    if (isset($json['license_expiry'])) {
        echo "  license_expiry: {$json['license_expiry']}\n";
        echo "  Expected format: YYYY-MM-DD (no time component)\n";
        echo "  Pass: " . (preg_match('/^\d{4}-\d{2}-\d{2}$/', $json['license_expiry']) ? "YES ✓" : "NO ✗") . "\n";
    }
    echo "\n";
}

// Test FinancialRecord model
$financialRecord = \App\Models\FinancialRecord::latest()->first();
if ($financialRecord) {
    $json = json_decode(json_encode($financialRecord), true);
    echo "✓ FinancialRecord (ID {$financialRecord->id}):\n";
    echo "  transaction_date: {$json['transaction_date']}\n";
    echo "  Expected format: YYYY-MM-DD (no time component)\n";
    echo "  Pass: " . (preg_match('/^\d{4}-\d{2}-\d{2}$/', $json['transaction_date']) ? "YES ✓" : "NO ✗") . "\n\n";
}

// Test Patient model
$patient = \App\Models\Patient::whereNotNull('birthday')->first();
if ($patient) {
    $json = json_decode(json_encode($patient), true);
    echo "✓ Patient (ID {$patient->id}):\n";
    echo "  birthday: {$json['birthday']}\n";
    echo "  Expected format: YYYY-MM-DD (no time component)\n";
    echo "  Pass: " . (preg_match('/^\d{4}-\d{2}-\d{2}$/', $json['birthday']) ? "YES ✓" : "NO ✗") . "\n\n";
}

echo "=== Verification Complete ===\n";
