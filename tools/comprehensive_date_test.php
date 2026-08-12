<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

echo "=== COMPREHENSIVE DATE FIX VERIFICATION ===\n\n";

// Test 1: Model toArray()
echo "1. Model toArray() Method:\n";
$appointment = \App\Models\Appointment::latest()->first();
if ($appointment) {
    $array = $appointment->toArray();
    echo "   appointment_date: {$array['appointment_date']}\n";
    echo "   Format check: " . (preg_match('/^\d{4}-\d{2}-\d{2}$/', $array['appointment_date']) ? "✓ PASS" : "✗ FAIL") . "\n\n";
} else {
    echo "   No appointments found\n\n";
}

// Test 2: Controller API Response
echo "2. AppointmentController@index API:\n";
$request = \Illuminate\Http\Request::create('/api/appointments', 'GET');
$request->headers->set('Accept', 'application/json');

$admin = \App\Models\User::where('role', 'admin')->first();
\Illuminate\Support\Facades\Auth::login($admin);

$controller = new \App\Http\Controllers\AppointmentController();
$response = $controller->index($request);
$content = json_decode($response->getContent(), true);

if (!empty($content['data'])) {
    $apt = $content['data'][0];
    echo "   appointment_date: {$apt['appointment_date']}\n";
    echo "   Format check: " . (preg_match('/^\d{4}-\d{2}-\d{2}$/', $apt['appointment_date']) ? "✓ PASS" : "✗ FAIL") . "\n\n";
} else {
    echo "   No appointments in response\n\n";
}

// Test 3: Patient API
echo "3. Patient Appointments API:\n";
$patientAppointment = \App\Models\Appointment::whereHas('patient')->first();
if ($patientAppointment) {
    $patient = $patientAppointment->patient;
    \Illuminate\Support\Facades\Auth::login($patient);
    $request = \Illuminate\Http\Request::create('/api/appointments', 'GET');
    $request->headers->set('Accept', 'application/json');

    $response = $controller->index($request);
    $content = json_decode($response->getContent(), true);

    if (!empty($content['data'])) {
        $apt = $content['data'][0];
        echo "   appointment_date: {$apt['appointment_date']}\n";
        echo "   Format check: " . (preg_match('/^\d{4}-\d{2}-\d{2}$/', $apt['appointment_date']) ? "✓ PASS" : "✗ FAIL") . "\n\n";
    } else {
        echo "   No appointments found for patient\n\n";
    }
} else {
    echo "   No patient with appointments found\n\n";
}

// Test 4: All Date Models
echo "4. All Models with Date Fields:\n";
$models = [
    ['class' => 'Appointment', 'field' => 'appointment_date'],
    ['class' => 'Schedule', 'field' => 'date'],
    ['class' => 'FinancialRecord', 'field' => 'transaction_date'],
];

foreach ($models as $model) {
    $class = "\\App\\Models\\{$model['class']}";
    $record = $class::latest()->first();
    if ($record) {
        $array = $record->toArray();
        if (isset($array[$model['field']])) {
            $value = $array[$model['field']];
            $pass = preg_match('/^\d{4}-\d{2}-\d{2}$/', $value);
            echo "   {$model['class']}.{$model['field']}: {$value} " . ($pass ? "✓" : "✗") . "\n";
        }
    }
}

echo "\n=== ALL TESTS COMPLETE ===\n";
echo "If all tests show ✓ PASS, the date display issue is fixed!\n";
echo "Remember to:\n";
echo "1. Clear browser cache (Ctrl+Shift+Delete)\n";
echo "2. Hard refresh (Ctrl+F5)\n";
echo "3. Check appointments pages in all portals\n";
