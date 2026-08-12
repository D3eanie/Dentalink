<?php
// Simple test to verify the API endpoint works

require 'bootstrap/app.php';

$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Create a test request
$request = Illuminate\Http\Request::create('/api/tooth-records?per_page=100', 'GET');

// Set up authentication context (simulate admin user)
$user = App\Models\User::find(1); // Adjust based on your admin user ID
$request->setUserResolver(function () use ($user) {
    return $user;
});

// Make the request
$response = $kernel->handle($request);

echo "Status: " . $response->getStatusCode() . "\n";
echo "Content-Type: " . $response->headers->get('Content-Type') . "\n";
echo "Body:\n";
echo $response->getContent() . "\n";
