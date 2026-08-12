<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\FinancialRecord;
use App\Services\BlockchainService;

$record = FinancialRecord::find(26);
$blockchain = app(BlockchainService::class);

echo "=== Record Details ===\n";
echo "ID: {$record->id}\n";
echo "Amount: {$record->amount}\n";
echo "Payment Status: {$record->payment_status}\n";
echo "Created At: {$record->created_at}\n";
echo "Updated At: {$record->updated_at}\n";
echo "Blockchain Hash: {$record->blockchain_hash}\n";
echo "Previous Hash: {$record->previous_blockchain_hash}\n\n";

echo "=== Hash Calculation ===\n";
$calculatedHash = $blockchain->calculateFinancialRecordHash($record);
echo "Calculated Record Hash: {$calculatedHash}\n";

$expectedPreviousHash = FinancialRecord::where('id', '<', $record->id)
    ->orderBy('id', 'desc')
    ->first()?->blockchain_hash ?? 'GENESIS_FINANCIAL';
echo "Expected Previous Hash: {$expectedPreviousHash}\n";

$expectedChainHash = hash('sha256', $expectedPreviousHash . $calculatedHash);
echo "Expected Chain Hash: {$expectedChainHash}\n";

echo "\n=== Comparison ===\n";
echo "Hash Match: " . ($record->blockchain_hash === $expectedChainHash ? 'YES' : 'NO') . "\n";
echo "Previous Hash Match: " . ($record->previous_blockchain_hash === $expectedPreviousHash ? 'YES' : 'NO') . "\n";
