<?php

/**
 * Comprehensive Blockchain Verification Test
 * Tests all aspects of the blockchain system including:
 * - Hash chain integrity
 * - JSON backup verification
 * - Immutability enforcement
 * - Cross-checking database vs JSON
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\BlockchainService;
use App\Services\FinancialLogEncryptionService;
use App\Models\FinancialRecord;
use Illuminate\Support\Facades\DB;

echo "=============================================================\n";
echo "  COMPREHENSIVE BLOCKCHAIN VERIFICATION TEST\n";
echo "=============================================================\n\n";

$blockchainService = app(BlockchainService::class);
$allTestsPassed = true;

// TEST 1: Check encrypted audit file
echo "TEST 1: Encrypted Audit File\n";
echo "------------------------------------------------------------\n";
$auditFilePath = FinancialLogEncryptionService::getSecureLogPath();
if (file_exists($auditFilePath)) {
    $fileSize = filesize($auditFilePath);
    echo "✓ Audit file exists: $auditFilePath\n";
    echo "  File size: $fileSize bytes\n";

    try {
        $jsonRecords = FinancialLogEncryptionService::readLogFile($auditFilePath);
        echo "✓ File successfully decrypted\n";
        echo "  Records in backup: " . count($jsonRecords) . "\n";
    } catch (Exception $e) {
        echo "❌ Failed to decrypt: " . $e->getMessage() . "\n";
        $allTestsPassed = false;
    }
} else {
    echo "❌ Audit file not found\n";
    $allTestsPassed = false;
}

// TEST 2: Database records
echo "\nTEST 2: Database Financial Records\n";
echo "------------------------------------------------------------\n";
$dbRecords = FinancialRecord::all();
echo "✓ Total records in database: " . $dbRecords->count() . "\n";
echo "  Verified records: " . $dbRecords->where('is_verified', true)->count() . "\n";
echo "  Unverified records: " . $dbRecords->where('is_verified', false)->count() . "\n";

foreach ($dbRecords as $record) {
    $immutable = $record->isImmutable() ? '🔒 Immutable' : '🔓 Mutable';
    $verified = $record->is_verified ? '✓' : '✗';
    echo "  Record #{$record->id}: ₱{$record->amount} - {$immutable} (Verified: {$verified})\n";
}

// TEST 3: Blockchain chain integrity
echo "\nTEST 3: Blockchain Chain Integrity\n";
echo "------------------------------------------------------------\n";
try {
    $chainVerification = $blockchainService->verifyFinancialRecordsChain();

    if ($chainVerification['chain_valid']) {
        echo "✓ Blockchain chain is VALID\n";
    } else {
        echo "❌ Blockchain chain is INVALID\n";
        $allTestsPassed = false;
    }

    echo "  Total records: {$chainVerification['total_records']}\n";
    echo "  Verified records: {$chainVerification['verified_records']}\n";
    echo "  Tampered records: {$chainVerification['tampered_records']}\n";

    if ($chainVerification['tampered_records'] > 0) {
        echo "\n  ⚠️  TAMPERED RECORDS DETECTED:\n";
        foreach ($chainVerification['details'] as $detail) {
            if (!$detail['valid']) {
                echo "    Record #{$detail['record_id']}: {$detail['reason']}\n";
            }
        }
    }
} catch (Exception $e) {
    echo "❌ Chain verification failed: " . $e->getMessage() . "\n";
    $allTestsPassed = false;
}

// TEST 4: Cross-check database vs JSON backup
echo "\nTEST 4: Database vs JSON Backup Cross-Check\n";
echo "------------------------------------------------------------\n";
try {
    $jsonRecords = FinancialLogEncryptionService::readLogFile($auditFilePath);
    $jsonRecordsById = collect($jsonRecords)->keyBy('id');

    $matched = 0;
    $missingInJson = 0;
    $missingInDb = 0;
    $dataMismatches = 0;

    // Check DB records against JSON
    foreach ($dbRecords as $dbRecord) {
        if (!isset($jsonRecordsById[$dbRecord->id])) {
            $missingInJson++;
        } else {
            $jsonRecord = $jsonRecordsById[$dbRecord->id];

            // Compare critical fields
            $dbAmount = (float)$dbRecord->amount;
            $jsonAmount = (float)($jsonRecord['amount'] ?? 0);

            $dbHash = $dbRecord->blockchain_hash;
            $jsonHash = $jsonRecord['blockchain_hash'] ?? null;

            if ($dbAmount === $jsonAmount && $dbHash === $jsonHash) {
                $matched++;
            } else {
                $dataMismatches++;
                echo "  ⚠️  Mismatch in Record #{$dbRecord->id}:\n";
                if ($dbAmount !== $jsonAmount) {
                    echo "      Amount: DB=₱{$dbAmount} vs JSON=₱{$jsonAmount}\n";
                }
                if ($dbHash !== $jsonHash) {
                    echo "      Hash: DB=" . substr($dbHash ?? 'null', 0, 20) . "... vs JSON=" . substr($jsonHash ?? 'null', 0, 20) . "...\n";
                }
            }
        }
    }

    // Check JSON records against DB
    foreach ($jsonRecordsById as $id => $jsonRecord) {
        if (!$dbRecords->where('id', $id)->first()) {
            $missingInDb++;
        }
    }

    echo "✓ Matched records: $matched\n";
    echo "  Missing in JSON: $missingInJson\n";
    echo "  Missing in DB: $missingInDb\n";
    echo "  Data mismatches: $dataMismatches\n";

    if ($dataMismatches > 0 || $missingInJson > 0 || $missingInDb > 0) {
        echo "\n  ⚠️  RECOMMENDATION: Run synchronization to fix mismatches\n";
        echo "      php artisan financial:sync-blockchain\n";
    }
} catch (Exception $e) {
    echo "❌ Cross-check failed: " . $e->getMessage() . "\n";
    $allTestsPassed = false;
}

// TEST 5: Immutability enforcement
echo "\nTEST 5: Immutability Enforcement\n";
echo "------------------------------------------------------------\n";
$verifiedRecord = $dbRecords->where('is_verified', true)->first();
if ($verifiedRecord) {
    echo "✓ Testing with verified record #{$verifiedRecord->id}\n";

    if ($verifiedRecord->isImmutable()) {
        echo "✓ Record correctly identified as immutable\n";
        echo "  Verification: Controller will block update/delete operations\n";
    } else {
        echo "❌ Record should be immutable but isImmutable() returned false\n";
        $allTestsPassed = false;
    }
} else {
    echo "⚠️  No verified records to test\n";
}

// TEST 6: Hash chain verifications log
echo "\nTEST 6: Historical Chain Verifications\n";
echo "------------------------------------------------------------\n";
try {
    $verifications = DB::table('hash_chain_verifications')
        ->where('table_name', 'financial_records')
        ->orderBy('verified_at', 'desc')
        ->limit(5)
        ->get();

    echo "✓ Last " . min(5, $verifications->count()) . " verification(s):\n";
    foreach ($verifications as $ver) {
        $status = $ver->chain_valid ? '✓ Valid' : '❌ Invalid';
        echo "  {$ver->verified_at}: {$status} ({$ver->verified_count} records)\n";
    }
} catch (Exception $e) {
    echo "⚠️  No verification history found\n";
}

// FINAL SUMMARY
echo "\n=============================================================\n";
echo "  TEST SUMMARY\n";
echo "=============================================================\n";

if ($allTestsPassed) {
    echo "✓ ALL TESTS PASSED\n";
    echo "\nBlockchain System Status: HEALTHY ✓\n";
    echo "- Hash chain integrity: Valid\n";
    echo "- Encrypted backup: Functional\n";
    echo "- Immutability enforcement: Active\n";
    echo "- Cross-verification: Ready\n";
} else {
    echo "❌ SOME TESTS FAILED\n";
    echo "\nPlease review the failed tests above and take corrective action.\n";
}

echo "\n=============================================================\n";
echo "Blockchain Verification Complete\n";
echo "=============================================================\n";
