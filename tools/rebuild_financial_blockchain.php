<?php

/**
 * Rebuild Financial Records Blockchain and JSON Audit Trail
 * This script regenerates blockchain hashes and JSON backup for all financial records
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\FinancialRecord;
use App\Services\BlockchainService;
use App\Services\FinancialLogEncryptionService;
use Illuminate\Support\Facades\Log;

echo "==============================================\n";
echo "Financial Records Blockchain Rebuild Utility\n";
echo "==============================================\n\n";

// Initialize blockchain service
$blockchainService = app(BlockchainService::class);

// Step 1: Rebuild blockchain hashes
echo "Step 1: Rebuilding blockchain hashes...\n";
$result = $blockchainService->rebuildFinancialRecordsBlockchain();
echo "✓ Total Records: {$result['total_records']}\n";
echo "✓ Successfully Rebuilt: {$result['rebuilt']}\n";
echo "✓ Errors: " . count($result['errors']) . "\n\n";

if (count($result['errors']) > 0) {
    echo "Errors encountered:\n";
    foreach ($result['errors'] as $error) {
        echo "  - Record ID {$error['record_id']}: {$error['error']}\n";
    }
    echo "\n";
}

// Step 2: Rebuild JSON audit trail file
echo "Step 2: Rebuilding encrypted audit trail file...\n";
$jsonFilePath = App\Services\FinancialLogEncryptionService::getSecureLogPath();

// Get all financial records
$records = FinancialRecord::with(['patient', 'appointment.service'])
    ->orderBy('id', 'asc')
    ->get();

$jsonRecords = [];
$count = 0;

foreach ($records as $record) {
    $recordData = [
        'id' => $record->id,
        'patient_id' => $record->patient_id,
        'patient_name' => $record->patient->name ?? null,
        'patient_email' => $record->patient->email ?? null,
        'appointment_id' => $record->appointment_id,
        'service_name' => $record->appointment->service->name ?? null,
        'amount' => $record->amount,
        'payment_status' => $record->payment_status,
        'payment_method' => $record->payment_method,
        'transaction_date' => $record->transaction_date,
        'description' => $record->description,
        'notes' => $record->notes,
        'blockchain_hash' => $record->blockchain_hash,
        'previous_hash' => $record->previous_blockchain_hash,
        'created_at' => $record->created_at ? $record->created_at->toISOString() : null,
        'updated_at' => $record->updated_at ? $record->updated_at->toISOString() : null,
        'logged_at' => now()->toISOString(),
    ];

    $jsonRecords[] = $recordData;
    $count++;
}

// Write to JSON file with encryption
FinancialLogEncryptionService::writeLogFile($jsonFilePath, $jsonRecords);

echo "✓ Secure audit file created (encrypted): " . basename($jsonFilePath) . "\n";
echo "✓ Total records in JSON: {$count}\n\n";

// Step 3: Verify blockchain integrity
echo "Step 3: Verifying blockchain integrity...\n";
$verification = $blockchainService->verifyFinancialRecordsChain();

echo "✓ Chain Valid: " . ($verification['chain_valid'] ? 'YES' : 'NO') . "\n";
echo "✓ Total Records: {$verification['total_records']}\n";
echo "✓ Verified Records: {$verification['verified_records']}\n";
echo "✓ Tampered Records: {$verification['tampered_records']}\n\n";

if ($verification['tampered_records'] > 0) {
    echo "Warning: Tampered records detected:\n";
    foreach ($verification['tampered_records_details'] as $tampered) {
        echo "  - Record ID {$tampered['id']}: " . implode(', ', $tampered['issues']) . "\n";
    }
    echo "\n";
}

echo "==============================================\n";
echo "Blockchain rebuild completed successfully!\n";
echo "==============================================\n";

Log::info('Financial records blockchain and JSON audit trail rebuilt', [
    'blockchain_result' => $result,
    'json_records' => $count,
    'verification' => $verification
]);
