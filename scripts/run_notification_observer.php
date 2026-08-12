<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$id = $argv[1] ?? null;
if (!$id) {
    echo "Usage: php scripts/run_notification_observer.php <notification_id>\n";
    exit(1);
}

$notification = App\Models\Notification::find($id);
if (!$notification) {
    echo "Notification not found.\n";
    exit(1);
}

$observer = new App\Observers\NotificationObserver();
try {
    echo "Calling NotificationObserver::created for notification {$id}\n";
    $observer->created($notification);
    echo "Observer returned without exception. Check logs for 'Notification email sent' or errors.\n";
} catch (\Exception $e) {
    echo "Observer threw exception: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
