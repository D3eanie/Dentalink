<?php

/**
 * Test Financial Record Verification Endpoint
 * Tests the mark-as-verified endpoint with proper authentication
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\FinancialRecord;
use App\Models\User;
use App\Http\Controllers\FinancialRecordController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

echo "=============================================================\n";
echo "  FINANCIAL RECORD VERIFICATION ENDPOINT TEST\n";
echo "=============================================================\n\n";

DB::beginTransaction();

try {
    // Get admin user
    $admin = User::where('role', 'admin')->first();
    if (!$admin) {
        echo "❌ No admin user found.\n";
        exit(1);
    }

    Auth::login($admin);
    echo "✓ Authenticated as: {$admin->name} (ID: {$admin->id})\n\n";

    // Create an unverified test record
    $record = FinancialRecord::create([
        'patient_id' => $admin->id,
        'amount' => 500.00,
        'balance' => 0,
        'payment_method' => 'cash',
        'transaction_date' => now(),
        'description' => 'Test verification endpoint',
        'notes' => 'Testing endpoint functionality',
    ]);

    // Generate blockchain hash
    $blockchainService = app(\App\Services\BlockchainService::class);
    $blockchainService->generateFinancialRecordBlockchainHash($record);
    $record->refresh();

    echo "TEST RECORD CREATED\n";
    echo "------------------------------------------------------------\n";
    echo "✓ Record ID: {$record->id}\n";
    echo "✓ Amount: ₱{$record->amount}\n";
    echo "✓ Blockchain Hash: " . substr($record->blockchain_hash, 0, 40) . "...\n";
    echo "✓ Initial Status: " . ($record->is_verified ? 'Verified' : 'Unverified') . "\n\n";

    // Test the markAsVerified endpoint
    echo "TEST 1: Call markAsVerified() Controller Method\n";
    echo "------------------------------------------------------------\n";

    $controller = new FinancialRecordController(app(\App\Services\BlockchainService::class));
    $request = Request::create("/api/financial-records/{$record->id}/mark-as-verified", 'POST');
    $request->headers->set('Accept', 'application/json');

    try {
        $response = $controller->markAsVerified($request, $record->id);
        $responseData = json_decode($response->getContent(), true);
        $statusCode = $response->getStatusCode();

        echo "✓ Response Status: $statusCode\n";
        echo "✓ Success: " . ($responseData['success'] ? 'Yes' : 'No') . "\n";
        echo "✓ Message: " . ($responseData['message'] ?? 'No message') . "\n";

        if ($responseData['success']) {
            $record->refresh();
            echo "✓ Record verification status: " . ($record->is_verified ? 'Verified' : 'Unverified') . "\n";
            echo "✓ Verified by: " . ($record->verified_by ?? 'None') . "\n";
            echo "✓ Verified at: " . ($record->verified_at ?? 'None') . "\n";

            if ($record->is_verified && $record->verified_by == $admin->id) {
                echo "\n✅ TEST PASSED: Verification endpoint works correctly!\n";
            } else {
                echo "\n❌ TEST FAILED: Record not properly verified\n";
            }
        } else {
            echo "\n❌ TEST FAILED: " . ($responseData['message'] ?? 'Unknown error') . "\n";
        }

    } catch (\Exception $e) {
        echo "❌ Exception: " . $e->getMessage() . "\n";
        echo "❌ TEST FAILED\n";
    }

    // Test with already verified record
    echo "\nTEST 2: Attempt to Verify Already Verified Record\n";
    echo "------------------------------------------------------------\n";

    if ($record->is_verified) {
        try {
            $response = $controller->markAsVerified($request, $record->id);
            $responseData = json_decode($response->getContent(), true);
            $statusCode = $response->getStatusCode();

            echo "✓ Response Status: $statusCode\n";
            echo "✓ Success: " . ($responseData['success'] ? 'Yes' : 'No') . "\n";
            echo "✓ Message: " . ($responseData['message'] ?? 'No message') . "\n";

            if (!$responseData['success']) {
                echo "\n✅ TEST PASSED: Correctly prevents duplicate verification\n";
            } else {
                echo "\n⚠️  WARNING: Should not allow duplicate verification\n";
            }

        } catch (\Exception $e) {
            echo "❌ Exception: " . $e->getMessage() . "\n";
        }
    }

    echo "\n=============================================================\n";
    echo "  ENDPOINT TEST COMPLETE\n";
    echo "=============================================================\n";

} finally {
    DB::rollBack();
    echo "\n✓ Test data cleaned up (transaction rolled back)\n";
}
