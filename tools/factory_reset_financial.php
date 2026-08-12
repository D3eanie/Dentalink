<?php

/**
 * Factory Reset - Complete Database Reset
 * This script performs a complete reset of all tables EXCEPT:
 * - users
 * - sessions
 * - services
 * - schedules
 * - migrations
 * WARNING: This action is irreversible!
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\FinancialLogEncryptionService;
use Illuminate\Support\Facades\DB;

echo "==============================================\n";
echo "FACTORY RESET - Complete Database Reset\n";
echo "==============================================\n";
echo "⚠️  WARNING: This will delete ALL data from database!\n";
echo "⚠️  PROTECTED TABLES (will NOT be cleared):\n";
echo "    • users\n";
echo "    • sessions\n";
echo "    • services\n";
echo "    • schedules\n";
echo "    • migrations\n";
echo "==============================================\n\n";

// Ask for confirmation
echo "Type 'YES' to confirm complete database reset: ";
$input = trim(fgets(STDIN));

if ($input !== 'YES') {
    echo "❌ Factory reset cancelled.\n";
    exit(0);
}

echo "\n🔄 Starting complete database reset...\n\n";

$errors = [];
$completed = [];

// Protected tables that should NOT be cleared
$protectedTables = [
    'users',
    'sessions',
    'services',
    'schedules',
    'migrations',
];

// Step 1: Delete encrypted JSON file
echo "Step 1: Backing up and deleting encrypted JSON file...\n";
$jsonFilePath = FinancialLogEncryptionService::getSecureLogPath();

if (file_exists($jsonFilePath)) {
    $backupPath = dirname($jsonFilePath) . '/.backup_' . date('Ymd_His') . '_' . basename($jsonFilePath);

    if (copy($jsonFilePath, $backupPath)) {
        echo "  ✓ Backup created: {$backupPath}\n";

        if (unlink($jsonFilePath)) {
            echo "  ✓ Deleted: {$jsonFilePath}\n";
            $completed[] = "Encrypted JSON file deleted";
        } else {
            $errors[] = "Could not delete encrypted JSON file";
        }
    } else {
        $errors[] = "Could not backup encrypted JSON file";
    }
} else {
    echo "  ℹ️  Encrypted JSON file does not exist (already clean)\n";
    $completed[] = "Encrypted JSON file (not found)";
}

// Step 2: Backup old JSON if it exists
echo "\nStep 2: Checking for old JSON backups...\n";
$oldJsonPath = database_path('financial_records_log.json');
if (file_exists($oldJsonPath)) {
    $oldBackupPath = database_path('financial_records_log_FACTORY_RESET_' . date('Ymd_His') . '.json');
    if (copy($oldJsonPath, $oldBackupPath)) {
        echo "  ✓ Backup created: {$oldBackupPath}\n";
        if (unlink($oldJsonPath)) {
            echo "  ✓ Deleted old file: {$oldJsonPath}\n";
            $completed[] = "Old JSON file deleted";
        }
    }
}

// Step 3: Get all tables and clear them (except protected ones)
echo "\nStep 3: Discovering all database tables...\n";
try {
    $databaseName = DB::getDatabaseName();
    $tables = DB::select("SHOW TABLES");
    $tableKey = "Tables_in_{$databaseName}";

    $allTables = array_map(function($table) use ($tableKey) {
        return $table->$tableKey;
    }, $tables);

    $tablesToClear = array_diff($allTables, $protectedTables);

    echo "  ✓ Found " . count($allTables) . " tables total\n";
    echo "  ✓ Protected: " . count($protectedTables) . " tables\n";
    echo "  ✓ To clear: " . count($tablesToClear) . " tables\n\n";

    // Step 4: Disable foreign key checks temporarily
    echo "Step 4: Disabling foreign key checks...\n";
    DB::statement('SET FOREIGN_KEY_CHECKS=0');
    echo "  ✓ Foreign key checks disabled\n\n";

    // Step 5: Clear each table
    echo "Step 5: Clearing tables...\n";
    $step = 5;
    foreach ($tablesToClear as $table) {
        try {
            $count = DB::table($table)->count();

            if ($count > 0) {
                // TRUNCATE automatically resets auto-increment
                DB::table($table)->truncate();
                echo "  ✓ Cleared '{$table}' ({$count} records, ID reset to 1)\n";
                $completed[] = "Table '{$table}' cleared ({$count} records)";
            } else {
                // Even for empty tables, ensure auto-increment is reset
                try {
                    DB::statement("ALTER TABLE `{$table}` AUTO_INCREMENT = 1");
                    echo "  ℹ️  Skipped '{$table}' (already empty, ID reset to 1)\n";
                } catch (\Exception $autoIncErr) {
                    echo "  ℹ️  Skipped '{$table}' (already empty)\n";
                }
                $completed[] = "Table '{$table}' (already empty)";
            }
        } catch (\Exception $e) {
            // If truncate fails (due to foreign keys), try delete + reset auto-increment
            try {
                $count = DB::table($table)->count();
                if ($count > 0) {
                    DB::table($table)->delete();
                    // Manually reset auto-increment after DELETE
                    DB::statement("ALTER TABLE `{$table}` AUTO_INCREMENT = 1");
                    echo "  ✓ Cleared '{$table}' using DELETE ({$count} records, ID reset to 1)\n";
                    $completed[] = "Table '{$table}' cleared via DELETE ({$count} records)";
                } else {
                    DB::statement("ALTER TABLE `{$table}` AUTO_INCREMENT = 1");
                    echo "  ℹ️  Skipped '{$table}' (already empty, ID reset to 1)\n";
                    $completed[] = "Table '{$table}' (already empty)";
                }
            } catch (\Exception $innerE) {
                echo "  ✗ Failed to clear '{$table}': {$innerE->getMessage()}\n";
                $errors[] = "Could not clear table '{$table}': {$innerE->getMessage()}";
            }
        }
    }

    echo "\n";

    // Step 6: Re-enable foreign key checks
    echo "Step 6: Re-enabling foreign key checks...\n";
    DB::statement('SET FOREIGN_KEY_CHECKS=1');
    echo "  ✓ Foreign key checks re-enabled\n\n";

} catch (\Exception $e) {
    $errors[] = "Database reset error: " . $e->getMessage();
    // Make sure to re-enable foreign keys even on error
    try {
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    } catch (\Exception $fkError) {
        // Ignore
    }
}

// Summary
echo "==============================================\n";
echo "FACTORY RESET SUMMARY\n";
echo "==============================================\n\n";

echo "📊 Statistics:\n";
echo "  • Tables cleared: " . count(array_filter($completed, function($item) {
    return strpos($item, 'Table') !== false && strpos($item, 'empty') === false;
})) . "\n";
echo "  • Tables skipped (empty): " . count(array_filter($completed, function($item) {
    return strpos($item, 'empty') !== false;
})) . "\n";
echo "  • Protected tables: " . count($protectedTables) . "\n";
echo "  • Errors encountered: " . count($errors) . "\n\n";

if (!empty($completed)) {
    echo "✅ Completed Actions:\n";
    $displayCount = 0;
    foreach ($completed as $action) {
        if ($displayCount < 10) {
            echo "  ✓ {$action}\n";
            $displayCount++;
        }
    }
    if (count($completed) > 10) {
        echo "  ... and " . (count($completed) - 10) . " more actions\n";
    }
    echo "\n";
}

if (!empty($errors)) {
    echo "❌ Errors:\n";
    foreach ($errors as $error) {
        echo "  ✗ {$error}\n";
    }
    echo "\n";
    echo "⚠️  Factory reset completed with errors.\n";
} else {
    echo "✅ Factory reset completed successfully!\n";
    echo "\n📋 Summary:\n";
    echo "  • All database tables cleared (except protected ones)\n";
    echo "  • JSON backup files removed\n";
    echo "  • Protected tables preserved:\n";
    foreach ($protectedTables as $table) {
        echo "    - {$table}\n";
    }
    echo "\n";
}

echo "==============================================\n";

exit(empty($errors) ? 0 : 1);
