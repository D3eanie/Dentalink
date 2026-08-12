<?php

/**
 * Financial Records Data Integrity Repair Tool
 *
 * This script performs a FACTORY RESET of the financial_records table and then
 * restores all data from the JSON backup file (source of truth).
 *
 * Process:
 * 1. DELETES ALL existing records in financial_records table
 * 2. RESTORES all records from the encrypted JSON backup file
 *
 * A detailed log of all deletions and restorations is saved to storage/logs/integrity_repairs/
 *
 * ⚠️  WARNING: This operation DELETES ALL existing financial records!
 * Make sure to backup your database before running this tool.
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\BlockchainService;
use App\Services\FinancialLogEncryptionService;
use Illuminate\Support\Facades\Log;

echo "=============================================================\n";
echo "  Financial Records Data Integrity Repair Tool\n";
echo "  FACTORY RESET MODE\n";
echo "=============================================================\n\n";

echo "⚠️  WARNING: This tool will FACTORY RESET the financial_records table!\n";
echo "   The JSON backup file (source of truth) is stored at:\n";
echo "   " . FinancialLogEncryptionService::getSecureLogPath() . "\n\n";
echo "   Actions performed:\n";
echo "   1. DELETE ALL existing financial records from database\n";
echo "   2. RESET auto-increment counter (IDs will start from 1)\n";
echo "   3. RESTORE all records from JSON backup file\n\n";
echo "   ⚠️  ALL CURRENT DATABASE RECORDS WILL BE DELETED!\n\n";

// Check if JSON file exists
$jsonFilePath = FinancialLogEncryptionService::getSecureLogPath();
if (!file_exists($jsonFilePath)) {
    echo "❌ ERROR: JSON backup file not found!\n";
    echo "   Cannot proceed with repair.\n";
    echo "   Please ensure the JSON backup file exists before running this tool.\n\n";
    exit(1);
}

echo "✓ JSON backup file found\n";
echo "✓ File size: " . round(filesize($jsonFilePath) / 1024, 2) . " KB\n\n";

// Read JSON file to show statistics
try {
    $jsonRecords = FinancialLogEncryptionService::readLogFile($jsonFilePath);
    $jsonCount = count($jsonRecords);
    echo "✓ JSON file contains {$jsonCount} financial record(s)\n\n";

    // Show database statistics
    $dbCount = \App\Models\FinancialRecord::count();
    echo "✓ Database contains {$dbCount} financial record(s)\n\n";

    if ($dbCount === 0 && $jsonCount === 0) {
        echo "ℹ️  Both database and JSON are empty. No operation needed.\n\n";
        exit(0);
    }

    if ($dbCount === 0 && $jsonCount > 0) {
        echo "ℹ️  Database is empty. Will restore {$jsonCount} record(s) from JSON.\n\n";
    }

    if ($dbCount > 0) {
        echo "⚠️  Database has {$dbCount} record(s) that will be DELETED.\n";
        echo "   Then {$jsonCount} record(s) will be restored from JSON.\n\n";
    }

    if ($jsonCount === 0 && $dbCount > 0) {
        echo "❌ ERROR: JSON file is empty but database has {$dbCount} record(s).\n";
        echo "   Cannot proceed with factory reset without backup data.\n\n";
        exit(1);
    }

} catch (\Exception $e) {
    echo "❌ ERROR: Failed to read JSON backup file\n";
    echo "   " . $e->getMessage() . "\n\n";
    exit(1);
}

// Confirmation prompt
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "⚠️  FINAL WARNING: Do you want to proceed with FACTORY RESET?\n";
echo "This will:\n";
echo "  1. DELETE ALL {$dbCount} existing record(s) from database\n";
echo "  2. RESET auto-increment counter (IDs start from 1)\n";
echo "  3. RESTORE {$jsonCount} record(s) from JSON backup\n";
echo "  4. Save detailed log to storage/logs/integrity_repairs/\n\n";
echo "⚠️  THIS ACTION CANNOT BE UNDONE!\n";
echo "⚠️  Make sure you have a database backup!\n\n";
echo "Type 'YES' (all caps) to proceed, or anything else to cancel: ";

$handle = fopen("php://stdin", "r");
$line = trim(fgets($handle));
fclose($handle);

if ($line !== 'YES') {
    echo "\n❌ Operation cancelled by user.\n\n";
    exit(0);
}

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "Starting FACTORY RESET and data restoration...\n\n";

// Initialize blockchain service
$blockchainService = app(BlockchainService::class);

// Perform repair (use user ID 0 to indicate system/CLI operation)
$startTime = microtime(true);
$result = $blockchainService->repairDataIntegrityFromJson(0);
$duration = round(microtime(true) - $startTime, 2);

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "  FACTORY RESET COMPLETED\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Display summary
echo "Summary:\n";
echo "  • Duration: {$duration} seconds\n";
echo "  • Status: " . ($result['success'] ? '✓ SUCCESS' : '❌ FAILED') . "\n\n";

echo "Statistics:\n";
echo "  • DB records before reset: {$result['summary']['total_db_records_before']}\n";
echo "  • Records deleted: {$result['summary']['records_deleted']}\n";
echo "  • JSON backup records: {$result['summary']['total_json_records']}\n";
echo "  • Records restored: {$result['summary']['records_restored']}\n";
echo "  • Errors encountered: {$result['summary']['errors_encountered']}\n\n";

// Display deleted records summary
if ($result['summary']['records_deleted'] > 0) {
    echo "Deleted Records (Factory Reset):\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "  • {$result['summary']['records_deleted']} record(s) deleted from database\n";
    echo "  • See deletion_log in repair report for details\n\n";
}

// Display restored records summary
if ($result['summary']['records_restored'] > 0) {
    echo "Restored Records (From JSON Backup):\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "  • {$result['summary']['records_restored']} record(s) restored from JSON\n";

    // Show first 5 as sample
    $sampleCount = min(5, count($result['restore_log']));
    if ($sampleCount > 0) {
        echo "\n  Sample of restored records (first {$sampleCount}):\n";
        for ($i = 0; $i < $sampleCount; $i++) {
            $log = $result['restore_log'][$i];
            $num = $i + 1;
            echo "  {$num}. ID: {$log['record_id']} | Patient: {$log['patient_id']} | Amount: $" . number_format($log['amount'], 2) . " | Status: {$log['payment_status']}\n";
        }
        if (count($result['restore_log']) > 5) {
            echo "  ... and " . (count($result['restore_log']) - 5) . " more (see report for full list)\n";
        }
    }
    echo "\n";
}



// Display errors if any
if (!empty($result['errors'])) {
    echo "Errors:\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    foreach ($result['errors'] as $error) {
        echo "  • {$error}\n";
    }
    echo "\n";
}

// Report location
$reportsDir = storage_path('logs/integrity_repairs');
$latestReport = glob($reportsDir . '/integrity_repair_*.json');
if (!empty($latestReport)) {
    usort($latestReport, function ($a, $b) {
        return filemtime($b) - filemtime($a);
    });
    echo "Detailed Report:\n";
    echo "  File: " . basename($latestReport[0]) . "\n";
    echo "  Path: {$latestReport[0]}\n\n";
}

// Recommendation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

// Automatically rebuild blockchain if records were restored
if ($result['success'] && $result['summary']['records_restored'] > 0) {
    echo "Automatically rebuilding blockchain hashes...\n\n";

    try {
        $rebuildResult = $blockchainService->rebuildFinancialRecordsBlockchain();

        echo "Blockchain Rebuild Results:\n";
        echo "  ✓ Total Records: {$rebuildResult['total_records']}\n";
        echo "  ✓ Successfully Rebuilt: {$rebuildResult['rebuilt']}\n";
        echo "  ✓ Errors: " . count($rebuildResult['errors']) . "\n";

        if (!empty($rebuildResult['errors'])) {
            echo "\n  Blockchain Errors:\n";
            foreach ($rebuildResult['errors'] as $error) {
                echo "    • {$error}\n";
            }
        }

        echo "\n";

        // Verify blockchain integrity
        echo "Verifying blockchain integrity...\n";
        $verifyResult = $blockchainService->verifyFinancialRecordsChain();

        echo "  ✓ Chain Valid: " . ($verifyResult['chain_valid'] ? 'YES' : 'NO') . "\n";
        echo "  ✓ Total Records: {$verifyResult['total_records']}\n";
        echo "  ✓ Verified Records: {$verifyResult['verified_records']}\n";
        echo "  ✓ Tampered Records: {$verifyResult['tampered_records']}\n\n";

        // Regenerate JSON backup file with new blockchain hashes
        echo "Regenerating JSON backup file with updated hashes...\n";
        $records = \App\Models\FinancialRecord::with(['patient', 'appointment.service'])->get();
        $jsonData = [];

        foreach ($records as $record) {
            $jsonData[] = [
                'id' => $record->id,
                'patient_id' => $record->patient_id,
                'appointment_id' => $record->appointment_id,
                'amount' => (float)$record->amount,
                'payment_status' => $record->payment_status,
                'payment_method' => $record->payment_method,
                'transaction_date' => $record->transaction_date,
                'description' => $record->description,
                'notes' => $record->notes,
                'blockchain_hash' => $record->blockchain_hash,
                'previous_hash' => $record->previous_blockchain_hash,
                'is_verified' => $record->is_verified,
                'created_at' => $record->created_at->toDateTimeString(),
                'updated_at' => $record->updated_at->toDateTimeString(),
            ];
        }

        FinancialLogEncryptionService::writeLogFile(FinancialLogEncryptionService::getSecureLogPath(), $jsonData);
        echo "  ✓ JSON backup updated with {$verifyResult['total_records']} record(s)\n\n";

    } catch (\Exception $e) {
        echo "  ❌ Blockchain rebuild failed: " . $e->getMessage() . "\n\n";
        echo "  Please run manually: php tools/rebuild_financial_blockchain.php\n\n";
    }
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "Next Steps:\n";
if ($result['summary']['records_restored'] > 0) {
    echo "  1. Review the detailed repair report:\n";
    echo "     storage/logs/integrity_repairs/\n\n";
    echo "  2. Verify all financial records are correct in the application\n\n";
    echo "  3. Test financial operations (create, view, update records)\n\n";
} else {
    echo "  • Factory reset completed but no records were restored.\n";
    echo "  • Database is now empty.\n\n";
}

echo "=============================================================\n";

exit($result['success'] ? 0 : 1);
