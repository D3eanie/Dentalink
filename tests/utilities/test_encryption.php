<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\FinancialLogEncryptionService;

$jsonFilePath = FinancialLogEncryptionService::getSecureLogPath();
$data = FinancialLogEncryptionService::readLogFile($jsonFilePath);

echo "✓ Records successfully decrypted: " . count($data) . "\n";
echo "✓ First record patient: " . $data[0]['patient_name'] . "\n";
echo "✓ Patient email: " . $data[0]['patient_email'] . "\n";
echo "✓ Amount: $" . $data[0]['amount'] . "\n";
echo "✓ Blockchain hash: " . substr($data[0]['blockchain_hash'], 0, 20) . "...\n";
