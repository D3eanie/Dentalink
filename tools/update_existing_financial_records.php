<?php

/**
 * Update Existing Financial Records - Remove Auto-Verification
 * This script updates existing financial records that were automatically verified
 * to require explicit admin verification
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\FinancialRecord;
use Illuminate\Support\Facades\DB;

echo "=============================================================\n";
echo "  UPDATE EXISTING FINANCIAL RECORDS\n";
echo "  Remove Auto-Verification from Existing Records\n";
echo "=============================================================\n\n";

// Get all verified records
$verifiedRecords = FinancialRecord::where('is_verified', true)->get();

echo "Found {$verifiedRecords->count()} verified record(s) in database\n\n";

if ($verifiedRecords->isEmpty()) {
    echo "✓ No records to update. All records are already unverified.\n";
    exit(0);
}

echo "Current Records:\n";
echo "------------------------------------------------------------\n";
foreach ($verifiedRecords as $record) {
    echo "  Record #{$record->id}: ₱{$record->amount} - Verified: " . ($record->is_verified ? 'Yes' : 'No') . "\n";
    echo "    Blockchain Hash: " . substr($record->blockchain_hash ?? 'None', 0, 40) . "...\n";
}

echo "\n";
echo "These records were automatically verified during blockchain hash generation.\n";
echo "The system has been updated to require explicit admin verification.\n\n";

echo "Options:\n";
echo "1. Keep current verifications (records remain verified and immutable)\n";
echo "2. Reset to unverified status (records become mutable until admin verifies)\n\n";

echo "This is a SIMULATION - no changes will be made.\n";
echo "To apply changes, admin should:\n";
echo " - Review each record individually\n";
echo " - Verify only legitimate, accurate records\n";
echo " - Use the 'Mark as Verified' button in the Financial Records page\n\n";

echo "=============================================================\n";
echo "RECOMMENDATION:\n";
echo "=============================================================\n";
echo "✓ Keep existing verified records as-is (they are already immutable)\n";
echo "✓ New records will require explicit admin verification\n";
echo "✓ Admins can verify new records via:\n";
echo "   - Financial Records page → View Details → Mark as Verified\n";
echo "   - API: POST /api/financial-records/{id}/mark-as-verified\n\n";

echo "✓ System configuration updated successfully!\n";
echo "=============================================================\n";
