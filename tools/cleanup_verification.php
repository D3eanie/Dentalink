<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Cleaning up remaining verification records...\n";
$count = DB::table('hash_chain_verifications')->delete();
echo "✓ Deleted {$count} verification records\n";
echo "✓ Blockchain verification table is now clean\n";
