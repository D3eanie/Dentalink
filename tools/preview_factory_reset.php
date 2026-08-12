<?php

/**
 * Preview Factory Reset - Shows what would be cleared
 * This script shows what tables would be cleared without actually clearing them
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "==============================================\n";
echo "FACTORY RESET - PREVIEW MODE\n";
echo "==============================================\n";
echo "This shows what would be cleared without actually clearing anything.\n";
echo "==============================================\n\n";

// Protected tables that should NOT be cleared
$protectedTables = [
    'users',
    'sessions',
    'services',
    'schedules',
    'migrations',
];

echo "🔍 Discovering database tables...\n\n";

try {
    $databaseName = DB::getDatabaseName();
    $tables = DB::select("SHOW TABLES");
    $tableKey = "Tables_in_{$databaseName}";

    $allTables = array_map(function($table) use ($tableKey) {
        return $table->$tableKey;
    }, $tables);

    sort($allTables);

    $tablesToClear = array_diff($allTables, $protectedTables);
    $protectedFound = array_intersect($allTables, $protectedTables);

    echo "📊 Statistics:\n";
    echo "  • Total tables: " . count($allTables) . "\n";
    echo "  • Would be cleared: " . count($tablesToClear) . "\n";
    echo "  • Would be protected: " . count($protectedFound) . "\n\n";

    echo "🔴 TABLES THAT WOULD BE CLEARED:\n";
    echo "==============================================\n";
    foreach ($tablesToClear as $table) {
        $count = DB::table($table)->count();
        echo "  • {$table} ({$count} records)\n";
    }

    echo "\n🟢 PROTECTED TABLES (will NOT be touched):\n";
    echo "==============================================\n";
    foreach ($protectedFound as $table) {
        $count = DB::table($table)->count();
        echo "  ✓ {$table} ({$count} records) - PROTECTED\n";
    }

    if (count($protectedTables) > count($protectedFound)) {
        echo "\n⚠️  Note: Some protected tables don't exist in database:\n";
        $missing = array_diff($protectedTables, $protectedFound);
        foreach ($missing as $table) {
            echo "  • {$table} - not found\n";
        }
    }

} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n==============================================\n";
echo "This was a PREVIEW only - no data was modified.\n";
echo "To actually perform the reset, run:\n";
echo "  php tools/factory_reset_financial.php\n";
echo "==============================================\n";
