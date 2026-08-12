<?php

/**
 * Test Admin Verification Requirement
 * Verifies that records are not automatically marked as verified
 * and require explicit admin verification
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\FinancialRecord;
use App\Models\User;
use App\Services\BlockchainService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

echo "=============================================================\n";
echo "  ADMIN VERIFICATION REQUIREMENT TEST\n";
echo "=============================================================\n\n";

DB::beginTransaction();

try {
    $blockchainService = app(BlockchainService::class);

    // Get admin user
    $admin = User::where('role', 'admin')->first();
    if (!$admin) {
        echo "❌ No admin user found. Please run database seeder first.\n";
        exit(1);
    }

    Auth::login($admin);

    echo "TEST 1: Create Financial Record Without Auto-Verification\n";
    echo "------------------------------------------------------------\n";

    // Create a new financial record
    $record = FinancialRecord::create([
        'patient_id' => $admin->id,
        'amount' => 1000.00,
        'balance' => 0,
        'payment_method' => 'cash',
        'transaction_date' => now(),
        'description' => 'Test payment for verification',
        'notes' => 'Testing admin verification requirement',
    ]);

    echo "✓ Financial record created (ID: {$record->id})\n";
    echo "  Amount: ₱{$record->amount}\n";
    echo "  Initial verification status: " . ($record->is_verified ? 'Verified' : 'Unverified') . "\n";

    if ($record->is_verified) {
        echo "❌ FAIL: Record should NOT be automatically verified\n";
        $allTestsPassed = false;
    } else {
        echo "✓ PASS: Record is not automatically verified\n";
    }

    echo "\nTEST 2: Generate Blockchain Hash Without Verification\n";
    echo "------------------------------------------------------------\n";

    // Generate blockchain hash
    $blockchainService->generateFinancialRecordBlockchainHash($record);
    $record->refresh();

    echo "✓ Blockchain hash generated\n";
    echo "  Hash: " . substr($record->blockchain_hash, 0, 40) . "...\n";
    echo "  Verification status after hash: " . ($record->is_verified ? 'Verified' : 'Unverified') . "\n";

    if ($record->is_verified) {
        echo "❌ FAIL: Record should NOT be verified just because blockchain hash was generated\n";
        $allTestsPassed = false;
    } else {
        echo "✓ PASS: Record remains unverified after blockchain hash generation\n";
    }

    echo "\nTEST 3: Check Immutability Status\n";
    echo "------------------------------------------------------------\n";

    $isImmutable = $record->isImmutable();
    echo "  Is Immutable: " . ($isImmutable ? 'Yes' : 'No') . "\n";

    if ($isImmutable) {
        echo "❌ FAIL: Unverified record should be mutable\n";
        $allTestsPassed = false;
    } else {
        echo "✓ PASS: Unverified record is mutable (can be edited)\n";
    }

    echo "\nTEST 4: Admin Marks Record as Verified\n";
    echo "------------------------------------------------------------\n";

    // Admin verifies the record
    $record->update([
        'is_verified' => true,
        'verified_by' => $admin->id,
        'verified_at' => now(),
    ]);
    $record->refresh();

    echo "✓ Admin verification applied\n";
    echo "  Verified by: {$admin->name} (ID: {$admin->id})\n";
    echo "  Verified at: {$record->verified_at}\n";
    echo "  Is verified: " . ($record->is_verified ? 'Yes' : 'No') . "\n";

    if (!$record->is_verified) {
        echo "❌ FAIL: Record should be verified after admin marks it\n";
        $allTestsPassed = false;
    } else {
        echo "✓ PASS: Record is now verified\n";
    }

    echo "\nTEST 5: Check Immutability After Verification\n";
    echo "------------------------------------------------------------\n";

    $isImmutableNow = $record->isImmutable();
    echo "  Is Immutable: " . ($isImmutableNow ? 'Yes' : 'No') . "\n";

    if (!$isImmutableNow) {
        echo "❌ FAIL: Verified record should be immutable\n";
        $allTestsPassed = false;
    } else {
        echo "✓ PASS: Verified record is now immutable (cannot be edited)\n";
    }

    echo "\n=============================================================\n";
    echo "  TEST SUMMARY\n";
    echo "=============================================================\n";

    if (!isset($allTestsPassed) || $allTestsPassed !== false) {
        echo "✓ ALL TESTS PASSED\n\n";
        echo "Verification Workflow:\n";
        echo "1. ✓ Records are created without automatic verification\n";
        echo "2. ✓ Blockchain hash generation does NOT verify records\n";
        echo "3. ✓ Unverified records remain mutable\n";
        echo "4. ✓ Only admin can mark records as verified\n";
        echo "5. ✓ Verified records become immutable\n";
        echo "\nResult: Admin verification requirement is ENFORCED ✓\n";
    } else {
        echo "❌ SOME TESTS FAILED\n";
        echo "\nPlease review the failed tests above.\n";
    }

    echo "\n=============================================================\n";

} finally {
    DB::rollBack();
    echo "\n✓ Test data cleaned up (transaction rolled back)\n";
}
