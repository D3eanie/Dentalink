<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$email = $argv[1] ?? null;
if (!$email) {
    echo "Usage: php scripts/send_test_notification.php you@domain.com\n";
    exit(1);
}

try {
    $user = App\Models\User::firstOrCreate(
        ['email' => $email],
        ['name' => 'Test Recipient', 'password' => bcrypt('TempPass123'), 'role' => 'patient']
    );

    $notification = App\Models\Notification::createAppointmentNotification(
        $user->id,
        'Test Notification',
        'This is a test notification sent at ' . now()
    );

    echo "Created/Found user id={$user->id} (email={$user->email})\n";
    echo "Created notification id={$notification->id}\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
