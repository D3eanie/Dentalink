<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$id = $argv[1] ?? null;
if (!$id) {
    $notification = App\Models\Notification::orderBy('created_at','desc')->first();
} else {
    $notification = App\Models\Notification::find($id);
}

if (!$notification) {
    echo "Notification not found.\n";
    exit(1);
}

$user = $notification->user;
if (!$user || empty($user->email)) {
    echo "Notification user or email missing.\n";
    exit(1);
}

use Illuminate\Support\Facades\Mail;
try {
    echo "Attempting send to {$user->email} for notification {$notification->id}\n";
    Mail::to($user->email)->send(new App\Mail\NotificationMail($notification));
    echo "Send attempted without exception.\n";
} catch (\Exception $e) {
    echo "Send failed: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
    // Write to laravel log as well
    \Illuminate\Support\Facades\Log::error('Direct send failed', ['notification_id' => $notification->id, 'error' => $e->getMessage()]);
    exit(1);
}

// Log success explicitly
\Illuminate\Support\Facades\Log::info('Direct send attempted', ['notification_id' => $notification->id, 'to' => $user->email]);
echo "Done. Check logs for 'Direct send attempted'.\n";