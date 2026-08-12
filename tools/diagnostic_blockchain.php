<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "==============================================\n";
echo "Database Diagnostic - Financial & Blockchain\n";
echo "==============================================\n\n";

// Check financial_records
echo "FINANCIAL RECORDS TABLE:\n";
$count = DB::table('financial_records')->count();
echo "Total count: {$count}\n";

if ($count > 0) {
    echo "\nRecords in table:\n";
    $records = DB::table('financial_records')->get();
    foreach ($records as $record) {
        echo "  ID: {$record->id}, Amount: {$record->amount}, Verified: {$record->is_verified}\n";
        echo "    Hash: " . substr($record->blockchain_hash ?? 'NULL', 0, 30) . "...\n";
    }
}

// Check hash_chain_verifications
echo "\n\nHASH CHAIN VERIFICATIONS TABLE:\n";
try {
    $verCount = DB::table('hash_chain_verifications')->count();
    echo "Total count: {$verCount}\n";

    if ($verCount > 0) {
        $verifications = DB::table('hash_chain_verifications')->latest('verified_at')->limit(3)->get();
        echo "\nLast 3 verifications:\n";
        foreach ($verifications as $ver) {
            echo "  ID: {$ver->id}, Table: {$ver->table_name}, Chain Valid: {$ver->chain_valid}\n";
            echo "    Verified At: {$ver->verified_at}\n";
        }
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

// Check audit_logs
echo "\n\nAUDIT LOGS TABLE:\n";
try {
    $auditCount = DB::table('audit_logs')->count();
    echo "Total count: {$auditCount}\n";

    if ($auditCount > 0) {
        $auditLogs = DB::table('audit_logs')->latest('id')->limit(3)->get();
        echo "\nLast 3 audit logs:\n";
        foreach ($auditLogs as $log) {
            echo "  ID: {$log->id}, Action: {$log->action}, Collection: {$log->target_collection}\n";
            echo "    Timestamp: {$log->timestamp}\n";
        }
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n==============================================\n";
