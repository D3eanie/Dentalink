<?php

/**
 * Migrate Financial Log to Secure Location
 * This script moves the financial_records_log.json to a more secure, obfuscated location
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\FinancialLogEncryptionService;

echo "==============================================\n";
echo "Migrate Financial Log to Secure Location\n";
echo "==============================================\n\n";

// Old location
$oldPath = database_path() . DIRECTORY_SEPARATOR . 'financial_records_log.json';

// New secure location
$newPath = FinancialLogEncryptionService::getSecureLogPath();

echo "Step 1: Checking old file location...\n";
echo "Old path: {$oldPath}\n";

if (!file_exists($oldPath)) {
    echo "⚠️  Old file not found. Checking if already migrated...\n";
    
    if (file_exists($newPath)) {
        echo "✓ File already exists at secure location.\n";
        echo "Migration not needed.\n\n";
        
        // Show current location info
        $data = FinancialLogEncryptionService::readLogFile($newPath);
        echo "Current secure location: " . dirname($newPath) . "\n";
        echo "Filename: " . basename($newPath) . "\n";
        echo "Records: " . count($data) . "\n";
        exit(0);
    } else {
        echo "❌ No financial log found in either location.\n";
        exit(1);
    }
}

echo "✓ Found file at old location\n\n";

echo "Step 2: Reading existing data...\n";
$data = FinancialLogEncryptionService::readLogFile($oldPath);
$recordCount = count($data);
echo "✓ Read {$recordCount} records\n\n";

echo "Step 3: Creating secure directory structure...\n";
$secureDir = dirname($newPath);
if (!is_dir($secureDir)) {
    mkdir($secureDir, 0755, true);
    echo "✓ Created directory: {$secureDir}\n";
} else {
    echo "✓ Directory already exists\n";
}

// Add .gitignore to prevent tracking
$gitignorePath = $secureDir . DIRECTORY_SEPARATOR . '.gitignore';
if (!file_exists($gitignorePath)) {
    file_put_contents($gitignorePath, "*\n!.gitignore\n");
    echo "✓ Created .gitignore\n";
}

echo "\n";

echo "Step 4: Moving to new secure location...\n";
echo "New location: " . dirname($newPath) . "\n";
echo "New filename: " . basename($newPath) . "\n";

// Write to new location
$success = FinancialLogEncryptionService::writeLogFile($newPath, $data);

if ($success) {
    echo "✓ File written to new location\n\n";
    
    // Verify
    echo "Step 5: Verifying new location...\n";
    $verifyData = FinancialLogEncryptionService::readLogFile($newPath);
    
    if (count($verifyData) === $recordCount) {
        echo "✓ Verification successful - all {$recordCount} records accessible\n\n";
        
        // Create backup of old file before deleting
        echo "Step 6: Creating backup of old file...\n";
        $backupPath = database_path() . DIRECTORY_SEPARATOR . 'financial_records_log_OLD_' . date('Ymd_His') . '.json';
        copy($oldPath, $backupPath);
        echo "✓ Backup created: {$backupPath}\n\n";
        
        // Delete old file
        echo "Step 7: Removing old file...\n";
        unlink($oldPath);
        echo "✓ Old file removed\n\n";
        
        echo "==============================================\n";
        echo "✅ MIGRATION COMPLETED SUCCESSFULLY!\n";
        echo "==============================================\n\n";
        echo "Security Improvements:\n";
        echo "✓ File moved to obfuscated location\n";
        echo "✓ Filename changed to look like system cache\n";
        echo "✓ Hidden in framework cache directory\n";
        echo "✓ Directory excluded from git tracking\n";
        echo "✓ Still encrypted and secure\n\n";
        echo "Old location backup: {$backupPath}\n";
        echo "New secure location: " . dirname($newPath) . "/" . basename($newPath) . "\n";
        
    } else {
        echo "❌ Verification failed - record count mismatch\n";
        echo "Rolling back...\n";
        unlink($newPath);
        exit(1);
    }
} else {
    echo "❌ Failed to write to new location\n";
    exit(1);
}
