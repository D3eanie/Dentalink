<?php

/**
 * Encrypt Existing Financial Records Log
 * This script encrypts the existing plain-text financial_records_log.json file
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\FinancialLogEncryptionService;

echo "==============================================\n";
echo "Financial Records Log Encryption Utility\n";
echo "==============================================\n\n";

$jsonFilePath = App\Services\FinancialLogEncryptionService::getSecureLogPath();
$backupFilePath = storage_path('framework/cache/.audit/backup_' . date('Y-m-d_His') . '.dat');

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

// Check if already encrypted
if (FinancialLogEncryptionService::isEncrypted($content)) {
    echo "✓ File is already encrypted. No action needed.\n";
    exit(0);
}

// Create backup of original file
echo "Step 1: Creating backup...\n";
copy($jsonFilePath, $backupFilePath);
echo "✓ Backup created: {$backupFilePath}\n\n";

// Parse the JSON
$data = json_decode($content, true);

if ($data === null) {
    echo "❌ Error: Invalid JSON format\n";
    exit(1);
}

$recordCount = count($data);
echo "Step 2: Encrypting {$recordCount} records...\n";

// Encrypt and write back
try {
    $success = FinancialLogEncryptionService::writeLogFile($jsonFilePath, $data);
    
    if ($success) {
        echo "✓ File encrypted successfully!\n\n";
        
        // Verify encryption
        echo "Step 3: Verifying encryption...\n";
        $encryptedContent = file_get_contents($jsonFilePath);
        
        if (FinancialLogEncryptionService::isEncrypted($encryptedContent)) {
            echo "✓ Encryption verified!\n\n";
            
            // Test decryption
            echo "Step 4: Testing decryption...\n";
            $decryptedData = FinancialLogEncryptionService::readLogFile($jsonFilePath);
            
            if (count($decryptedData) === $recordCount) {
                echo "✓ Decryption test passed! All {$recordCount} records accessible.\n\n";
                
                echo "==============================================\n";
                echo "Encryption completed successfully!\n";
                echo "==============================================\n\n";
                echo "Original backup saved to:\n{$backupFilePath}\n\n";
                echo "The financial_records_log.json is now encrypted\n";
                echo "✓ Unreadable to the naked eye\n";
                echo "✓ System can still decrypt for verification\n";
            } else {
                echo "❌ Error: Decryption test failed - record count mismatch\n";
                echo "Restoring from backup...\n";
                copy($backupFilePath, $jsonFilePath);
                exit(1);
            }
        } else {
            echo "❌ Error: Encryption verification failed\n";
            echo "Restoring from backup...\n";
            copy($backupFilePath, $jsonFilePath);
            exit(1);
        }
    } else {
        echo "❌ Error: Failed to encrypt file\n";
        exit(1);
    }
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Restoring from backup...\n";
    copy($backupFilePath, $jsonFilePath);
    exit(1);
}
