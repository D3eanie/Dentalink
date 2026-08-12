<?php

/**
 * Factory Reset - Blockchain Verification
 * This script resets all blockchain verification data and hashes
 * WARNING: This action is irreversible!
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "==============================================\n";
echo "FACTORY RESET - Blockchain Verification\n";
echo "==============================================\n";
echo "⚠️  WARNING: This will delete ALL blockchain data!\n";
echo "==============================================\n\n";

// Ask for confirmation
echo "Type 'YES' to confirm factory reset: ";
$input = trim(fgets(STDIN));

if ($input !== 'YES') {
    echo "❌ Factory reset cancelled.\n";
    exit(0);
}

echo "\n🔄 Starting blockchain factory reset...\n\n";

$errors = [];
$completed = [];

// Step 1: Clear audit_logs table
echo "Step 1: Clearing audit_logs table...\n";
try {
    $count = DB::table('audit_logs')->count();
    DB::table('audit_logs')->truncate();
    echo "  ✓ Deleted {$count} audit log entries\n";
    $completed[] = "Audit logs cleared";
} catch (\Exception $e) {
    $errors[] = "Could not clear audit_logs: " . $e->getMessage();
}

// Step 2: Clear hash_chain_verifications table (if exists)
echo "\nStep 2: Clearing hash chain verifications...\n";
try {
    // Check if table exists
    $tables = DB::select("SHOW TABLES LIKE 'hash_chain_verifications'");
    if (!empty($tables)) {
        $count = DB::table('hash_chain_verifications')->count();
        DB::table('hash_chain_verifications')->truncate();
        echo "  ✓ Deleted {$count} hash chain verification entries\n";
        $completed[] = "Hash chain verifications cleared";
    } else {
        echo "  ℹ️  Table does not exist (already clean)\n";
    }
} catch (\Exception $e) {
    $errors[] = "Could not clear hash_chain_verifications: " . $e->getMessage();
}

// Step 3: Reset blockchain fields in financial_records
echo "\nStep 3: Resetting blockchain fields in financial_records...\n";
try {
    $count = DB::table('financial_records')->count();
    DB::table('financial_records')->update([
        'blockchain_hash' => null,
        'previous_blockchain_hash' => null,
        'is_verified' => false,
    ]);
    echo "  ✓ Reset blockchain fields for {$count} financial records\n";
    $completed[] = "Financial records blockchain fields reset";
} catch (\Exception $e) {
    $errors[] = "Could not reset financial_records blockchain fields: " . $e->getMessage();
}

// Step 4: Reset blockchain fields in patient_records (if applicable)
echo "\nStep 4: Resetting blockchain fields in patient_records (if exists)...\n";
try {
    $tables = DB::select("SHOW TABLES LIKE 'patient_records'");
    if (!empty($tables)) {
        // Check if blockchain fields exist
        $columns = DB::select("SHOW COLUMNS FROM patient_records LIKE 'blockchain_hash'");
        if (!empty($columns)) {
            $count = DB::table('patient_records')->count();
            DB::table('patient_records')->update([
                'blockchain_hash' => null,
                'previous_blockchain_hash' => null,
                'is_verified' => false,
            ]);
            echo "  ✓ Reset blockchain fields for {$count} patient records\n";
            $completed[] = "Patient records blockchain fields reset";
        } else {
            echo "  ℹ️  No blockchain fields in patient_records\n";
        }
    } else {
        echo "  ℹ️  Table does not exist\n";
    }
} catch (\Exception $e) {
    $errors[] = "Could not reset patient_records blockchain fields: " . $e->getMessage();
}

// Summary
echo "\n==============================================\n";
echo "BLOCKCHAIN RESET SUMMARY\n";
echo "==============================================\n\n";

if (!empty($completed)) {
    echo "✅ Completed Actions:\n";
    foreach ($completed as $action) {
        echo "  ✓ {$action}\n";
    }
    echo "\n";
}

if (!empty($errors)) {
    echo "❌ Errors:\n";
    foreach ($errors as $error) {
        echo "  ✗ {$error}\n";
    }
    echo "\n";
} else {
    echo "✅ Blockchain factory reset completed successfully!\n";
    echo "\nAll blockchain verification data has been cleared.\n";
    echo "Audit logs and blockchain hashes have been reset.\n";
}

echo "==============================================\n";
