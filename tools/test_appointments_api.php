<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

// Simulate an API request to the appointments endpoint
$request = \Illuminate\Http\Request::create('/api/appointments', 'GET');
$request->headers->set('Accept', 'application/json');

// Set authenticated user (simulate as admin)
$admin = \App\Models\User::where('role', 'admin')->first();
if (!$admin) {
    echo "Admin user not found\n";
    exit(1);
}

\Illuminate\Support\Facades\Auth::login($admin);

try {
    $controller = new \App\Http\Controllers\AppointmentController();
    $response = $controller->index($request);

    // Get JSON content
    $content = json_decode($response->getContent(), true);

    echo "=== Appointments API Response Test ===\n\n";
    echo "Success: " . ($content['success'] ? 'YES' : 'NO') . "\n";
    echo "Total appointments: " . count($content['data']) . "\n\n";

    if (count($content['data']) > 0) {
        $appointment = $content['data'][0];
        echo "First Appointment Details:\n";
        echo "  ID: {$appointment['id']}\n";
        echo "  appointment_date: {$appointment['appointment_date']}\n";
        echo "  appointment_time: {$appointment['appointment_time']}\n\n";

        // Check date format
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $appointment['appointment_date'])) {
            echo "✓ Date format is correct: YYYY-MM-DD (no time/timezone)\n";
        } else {
            echo "✗ Date format is INCORRECT: {$appointment['appointment_date']}\n";
            echo "  Expected format: YYYY-MM-DD\n";
        }
    } else {
        echo "No appointments found\n";
    }

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
