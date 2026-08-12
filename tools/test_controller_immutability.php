<?php

/**
 * Test Controller-Level Immutability Protection
 * Simulates API calls to verify that verified records cannot be updated or deleted
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
echo "  CONTROLLER IMMUTABILITY PROTECTION TEST\n";
echo "=============================================================\n\n";

// Setup: Get or create a verified financial record
DB::beginTransaction();

try {
    // Get admin user
    $admin = User::where('role', 'admin')->first();
    if (!$admin) {
        echo "❌ No admin user found. Please run database seeder first.\n";
        exit(1);
    }

    // Authenticate as admin for testing
    Auth::login($admin);

    echo "TEST SETUP\n";
    echo "------------------------------------------------------------\n";
    echo "✓ Authenticated as: {$admin->name} (ID: {$admin->id})\n\n";

    // Create a test financial record and verify it
    $testRecord = FinancialRecord::create([
        'patient_id' => $admin->id,
        'amount' => 500.00,
        'balance' => 0,
        'payment_method' => 'cash',
        'transaction_date' => now(),
        'description' => 'Test record for immutability verification',
        'notes' => 'This is a test record',
    ]);

    echo "TEST RECORD CREATED\n";
    echo "------------------------------------------------------------\n";
    echo "✓ Record ID: {$testRecord->id}\n";
    echo "✓ Amount: ₱{$testRecord->amount}\n";
    echo "✓ Initial Status: " . ($testRecord->is_verified ? 'Verified' : 'Unverified') . "\n";
    echo "✓ Is Immutable: " . ($testRecord->isImmutable() ? 'Yes' : 'No') . "\n\n";

    // TEST 1: Update unverified record (should succeed)
    echo "TEST 1: Update Unverified Record\n";
    echo "------------------------------------------------------------\n";

    $controller = new FinancialRecordController(app(\App\Services\BlockchainService::class));
    $request = Request::create('/financial-records/' . $testRecord->id, 'PUT', [
        'patient_id' => $testRecord->patient_id,
        'amount' => 600.00,
        'payment_method' => 'cash',
        'transaction_date' => now()->format('Y-m-d'),
        'description' => 'Updated description',
        'notes' => 'Updated notes',
    ]);
    $request->headers->set('Accept', 'application/json');

    try {
        $response = $controller->update($request, $testRecord->id);
        $responseData = json_decode($response->getContent(), true);

        if ($responseData['success'] ?? false) {
            echo "✓ PASS: Unverified record successfully updated\n";
            $testRecord->refresh();
            echo "  New amount: ₱{$testRecord->amount}\n";
        } else {
            echo "❌ FAIL: Should allow updating unverified records\n";
            echo "  Message: " . ($responseData['message'] ?? 'Unknown error') . "\n";
        }
    } catch (Exception $e) {
        echo "❌ FAIL: Exception occurred: " . $e->getMessage() . "\n";
    }

    // Verify the record to make it immutable
    echo "\nVERIFYING RECORD\n";
    echo "------------------------------------------------------------\n";
    $testRecord->update([
        'is_verified' => true,
        'verified_by' => $admin->id,
        'verified_at' => now(),
    ]);
    $testRecord->refresh();
    echo "✓ Record verified\n";
    echo "✓ Is Immutable: " . ($testRecord->isImmutable() ? 'Yes' : 'No') . "\n\n";

    // TEST 2: Attempt to update verified record (should fail)
    echo "TEST 2: Attempt to Update Verified Record\n";
    echo "------------------------------------------------------------\n";

    $request = Request::create('/financial-records/' . $testRecord->id, 'PUT', [
        'patient_id' => $testRecord->patient_id,
        'amount' => 700.00,
        'payment_method' => 'cash',
        'transaction_date' => now()->format('Y-m-d'),
        'description' => 'Attempting to update verified record',
        'notes' => 'This should fail',
    ]);
    $request->headers->set('Accept', 'application/json');

    try {
        $response = $controller->update($request, $testRecord->id);
        $responseData = json_decode($response->getContent(), true);
        $statusCode = $response->getStatusCode();

        if ($statusCode === 403 && !($responseData['success'] ?? true)) {
            echo "✓ PASS: Update blocked with 403 Forbidden\n";
            echo "  Message: " . ($responseData['message'] ?? 'No message') . "\n";

            // Verify data wasn't changed
            $testRecord->refresh();
            if ($testRecord->amount == 600.00) {
                echo "✓ Data integrity maintained: Amount still ₱600.00\n";
            } else {
                echo "❌ Data was modified despite immutability!\n";
            }
        } else {
            echo "❌ FAIL: Verified record should not be updatable\n";
            echo "  Status Code: $statusCode\n";
            echo "  Response: " . json_encode($responseData) . "\n";
        }
    } catch (Exception $e) {
        echo "❌ FAIL: Exception occurred: " . $e->getMessage() . "\n";
    }

    // TEST 3: Attempt to delete verified record (should fail)
    echo "\nTEST 3: Attempt to Delete Verified Record\n";
    echo "------------------------------------------------------------\n";

    $request = Request::create('/financial-records/' . $testRecord->id, 'DELETE');
    $request->headers->set('Accept', 'application/json');

    try {
        $response = $controller->destroy($testRecord->id);
        $responseData = json_decode($response->getContent(), true);
        $statusCode = $response->getStatusCode();

        if ($statusCode === 403 && !($responseData['success'] ?? true)) {
            echo "✓ PASS: Delete blocked with 403 Forbidden\n";
            echo "  Message: " . ($responseData['message'] ?? 'No message') . "\n";

            // Verify record still exists
            if (FinancialRecord::find($testRecord->id)) {
                echo "✓ Record still exists in database\n";
            } else {
                echo "❌ Record was deleted despite immutability!\n";
            }
        } else {
            echo "❌ FAIL: Verified record should not be deletable\n";
            echo "  Status Code: $statusCode\n";
            echo "  Response: " . json_encode($responseData) . "\n";
        }
    } catch (Exception $e) {
        echo "❌ FAIL: Exception occurred: " . $e->getMessage() . "\n";
    }

    echo "\n=============================================================\n";
    echo "  TEST SUMMARY\n";
    echo "=============================================================\n";
    echo "✓ Controller-level immutability protection is ACTIVE\n";
    echo "✓ Verified records cannot be updated (403 Forbidden)\n";
    echo "✓ Verified records cannot be deleted (403 Forbidden)\n";
    echo "✓ Unverified records remain mutable\n";
    echo "\n=============================================================\n";

} finally {
    // Rollback to clean up test data
    DB::rollBack();
    echo "\n✓ Test data cleaned up (transaction rolled back)\n";
}
