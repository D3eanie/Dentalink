<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$limit = (int)($argv[1] ?? 20);
$notifications = App\Models\Notification::orderBy('created_at','desc')->limit($limit)->get();

if ($notifications->isEmpty()) {
    echo "No notifications found.\n";
    exit(0);
}

foreach ($notifications as $n) {
    $user = $n->user;
    $email = $user->email ?? '(no email)';
    echo sprintf("%4d | %-30s | %-12s | %-30s | %s\n", $n->id, $email, $n->type, $n->title, $n->created_at);
}
