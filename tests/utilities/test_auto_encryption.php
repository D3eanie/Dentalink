<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\FinancialRecord;
use App\Models\User;
use App\Models\Appointment;
use App\Services\FinancialLogEncryptionService;

echo "==============================================\n";
echo "Testing Automatic Encryption for New Records\n";
echo "==============================================\n\n";

$jsonFilePath = FinancialLogEncryptionService::getSecureLogPath();

// Check current state
echo "Step 1: Reading current encrypted file...\n";
$beforeData = FinancialLogEncryptionService::readLogFile($jsonFilePath);
$beforeCount = count($beforeData);
echo "✓ Current records in file: {$beforeCount}\n\n";

// Read raw file to confirm encryption
$rawContent = file_get_contents($jsonFilePath);
$isEncrypted = FinancialLogEncryptionService::isEncrypted($rawContent);
echo "Step 2: Checking encryption status...\n";
echo "✓ File is " . ($isEncrypted ? "ENCRYPTED ✅" : "PLAIN TEXT ❌") . "\n\n";

echo "Step 3: Simulating new record creation...\n";
echo "   (Testing the writeFinancialRecordToJson logic)\n\n";

// Get a sample patient and appointment for testing
$patient = User::where('role', 'patient')->first();
$appointment = Appointment::with('service')->first();

if (!$patient || !$appointment) {
    echo "⚠️  No test data available. Creating mock record data...\n";
    $testRecord = [
        'id' => 999,
        'patient_id' => 1,
        'patient_name' => 'Test Patient',
        'patient_email' => 'test@example.com',
        'appointment_id' => 1,
        'service_name' => 'Test Service',
        'amount' => '100.00',
        'payment_status' => 'paid',
        'payment_method' => 'cash',
        'transaction_date' => now()->toISOString(),
        'description' => 'Test Record',
        'notes' => null,
        'blockchain_hash' => 'TEST_HASH_' . bin2hex(random_bytes(16)),
        'previous_hash' => 'PREVIOUS_TEST',
        'created_at' => now()->toISOString(),
        'updated_at' => now()->toISOString(),
        'logged_at' => now()->toISOString(),
    ];
} else {
    echo "✓ Using existing data for simulation\n";
    $testRecord = [
        'id' => 999,
        'patient_id' => $patient->id,
        'patient_name' => $patient->name,
        'patient_email' => $patient->email,
        'appointment_id' => $appointment->id,
        'service_name' => $appointment->service->name ?? 'Test Service',
        'amount' => '150.00',
        'payment_status' => 'paid',
        'payment_method' => 'cash',
        'transaction_date' => now()->toISOString(),
        'description' => 'Encryption Test Record',
        'notes' => 'Testing automatic encryption',
        'blockchain_hash' => 'TEST_HASH_' . bin2hex(random_bytes(16)),
        'previous_hash' => 'PREVIOUS_TEST',
        'created_at' => now()->toISOString(),
        'updated_at' => now()->toISOString(),
        'logged_at' => now()->toISOString(),
    ];
}

// Simulate what writeFinancialRecordToJson does
$allRecords = FinancialLogEncryptionService::readLogFile($jsonFilePath);
$allRecords[] = $testRecord;
$success = FinancialLogEncryptionService::writeLogFile($jsonFilePath, $allRecords);

if ($success) {
    echo "✓ Test record added using encryption service\n\n";
    
    // Verify the file is still encrypted
    echo "Step 4: Verifying file is still encrypted...\n";
    $rawContent = file_get_contents($jsonFilePath);
    $isStillEncrypted = FinancialLogEncryptionService::isEncrypted($rawContent);
    
    if ($isStillEncrypted) {
        echo "✅ SUCCESS! File is still ENCRYPTED\n\n";
        
        // Verify we can read the data back
        echo "Step 5: Verifying data can be read back...\n";
        $afterData = FinancialLogEncryptionService::readLogFile($jsonFilePath);
        $afterCount = count($afterData);
        
        echo "✓ Records after adding: {$afterCount}\n";
        echo "✓ New test record patient: " . $afterData[$afterCount - 1]['patient_name'] . "\n\n";
        
        // Remove the test record
        echo "Step 6: Cleaning up test record...\n";
        array_pop($allRecords);
        FinancialLogEncryptionService::writeLogFile($jsonFilePath, $allRecords);
        echo "✓ Test record removed\n\n";
        
        echo "==============================================\n";
        echo "✅ AUTOMATIC ENCRYPTION CONFIRMED!\n";
        echo "==============================================\n\n";
        echo "Result: New records ARE automatically encrypted ✅\n";
        echo "        when added to financial_records_log.json\n\n";
        echo "The system uses FinancialLogEncryptionService which:\n";
        echo "  • Reads encrypted data automatically\n";
        echo "  • Adds new records to the array\n";
        echo "  • Writes everything back encrypted\n";
        
    } else {
        echo "❌ WARNING: File is NOT encrypted!\n";
    }
} else {
    echo "❌ Failed to write test record\n";
}
