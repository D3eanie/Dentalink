<?php

/**
 * Decrypt Financial Records Log (for troubleshooting)
 * This script decrypts the financial_records_log.json file back to plain text
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\FinancialLogEncryptionService;

echo "==============================================\n";
echo "Financial Records Log Decryption Utility\n";
echo "==============================================\n\n";

$jsonFilePath = App\Services\FinancialLogEncryptionService::getSecureLogPath();

// Check if file exists
if (!file_exists($jsonFilePath)) {
    echo "❌ Error: File not found at {$jsonFilePath}\n";
    exit(1);
}

// Read the current file
$content = file_get_contents($jsonFilePath);

if (empty($content)) {
    echo "❌ Error: File is empty\n";
    exit(1);
}

// Check if encrypted
if (!FinancialLogEncryptionService::isEncrypted($content)) {
    echo "✓ File is already in plain text. No action needed.\n";
    exit(0);
}

echo "Step 1: Reading encrypted data...\n";

try {
    $data = FinancialLogEncryptionService::readLogFile($jsonFilePath);
    $recordCount = count($data);
    
    echo "✓ Successfully decrypted {$recordCount} records\n\n";
    
    echo "Step 2: Converting to plain text JSON...\n";
    $jsonData = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    echo "Step 3: Writing plain text file...\n";
    file_put_contents($jsonFilePath, $jsonData);
    
    echo "✓ File decrypted successfully!\n\n";
    
    echo "==============================================\n";
    echo "Decryption completed successfully!\n";
    echo "==============================================\n\n";
    echo "The financial_records_log.json is now in plain text.\n";
    echo "⚠️  WARNING: File is now readable to anyone with file access!\n";
    echo "⚠️  Run encrypt_financial_log.php to re-encrypt for security.\n";
    
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
