<?php

/**
 * Generate Blockchain Verification & Audit Trail Report
 * Creates a comprehensive CSV report of blockchain integrity and JSON backup verification
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\BlockchainService;
use App\Services\FinancialLogEncryptionService;
use App\Models\FinancialRecord;

echo "=============================================================\n";
echo "  Blockchain Verification & Audit Trail Report Generator\n";
echo "=============================================================\n\n";

// Initialize blockchain service
$blockchainService = app(BlockchainService::class);

echo "Step 1: Verifying blockchain integrity...\n";
$verification = $blockchainService->verifyFinancialRecordsChain();

echo "  ✓ Chain Valid: " . ($verification['chain_valid'] ? 'YES' : 'NO') . "\n";
echo "  ✓ Total Records: {$verification['total_records']}\n";
echo "  ✓ Verified Records: {$verification['verified_records']}\n";
echo "  ✓ Tampered Records: {$verification['tampered_records']}\n\n";

echo "Step 2: Cross-checking with JSON backup...\n";

// Cross-check with JSON backup
$jsonFilePath = FinancialLogEncryptionService::getSecureLogPath();
$jsonRecords = file_exists($jsonFilePath) ? FinancialLogEncryptionService::readLogFile($jsonFilePath) : [];
$dbRecords = FinancialRecord::all();

$dbRecordsById = $dbRecords->keyBy('id');
$jsonRecordsById = collect($jsonRecords)->keyBy('id');

$matchedRecords = 0;
$missingInJson = [];
$missingInJsonDetails = [];
$missingInDb = [];
$missingInDbDetails = [];
$mismatchedData = [];
$mismatchedDataDetails = [];
$issues = [];

// Check database records against JSON
foreach ($dbRecords as $dbRecord) {
    if (!isset($jsonRecordsById[$dbRecord->id])) {
        $missingInJson[] = $dbRecord->id;
        $missingInJsonDetails[] = [
            'id' => $dbRecord->id,
            'patient_id' => $dbRecord->patient_id,
            'amount' => (float)$dbRecord->amount,
            'balance' => (float)$dbRecord->balance,
            'transaction_date' => $dbRecord->transaction_date,
            'blockchain_hash' => $dbRecord->blockchain_hash,
            'created_at' => $dbRecord->created_at->toDateTimeString(),
        ];
    } else {
        $jsonRecord = $jsonRecordsById[$dbRecord->id];

        // Compare critical fields with before/after values
        $fieldChanges = [];
        $criticalFields = [
            'amount',
            'balance',
            'payment_method',
            'transaction_date',
            'description',
            'notes',
            'blockchain_hash',
            'previous_blockchain_hash',
        ];

        foreach ($criticalFields as $field) {
            $dbValue = match ($field) {
                'transaction_date' => $dbRecord->$field ? $dbRecord->$field->format('Y-m-d') : null,
                'amount', 'balance' => (float)($dbRecord->$field ?? 0),
                default => $dbRecord->$field ?? null,
            };

            $jsonValue = match ($field) {
                'transaction_date' => $jsonRecord[$field] ?? null,
                'amount', 'balance' => isset($jsonRecord[$field]) ? (float)$jsonRecord[$field] : null,
                default => $jsonRecord[$field] ?? null,
            };

            if ($dbValue !== $jsonValue) {
                $fieldChanges[$field] = [
                    'before' => $jsonValue,
                    'after' => $dbValue,
                ];
            }
        }

        if (!empty($fieldChanges)) {
            $mismatchedData[] = $dbRecord->id;
            $mismatchedDataDetails[] = [
                'id' => $dbRecord->id,
                'patient_id' => $dbRecord->patient_id,
                'field_changes' => $fieldChanges,
            ];
        } else {
            $matchedRecords++;
        }
    }
}

// Check JSON records against database
foreach ($jsonRecordsById as $id => $jsonRecord) {
    if (!isset($dbRecordsById[$id])) {
        $missingInDb[] = $id;
        $missingInDbDetails[] = [
            'id' => $jsonRecord['id'],
            'patient_id' => $jsonRecord['patient_id'],
            'amount' => (float)$jsonRecord['amount'],
            'balance' => (float)($jsonRecord['balance'] ?? 0),
            'transaction_date' => $jsonRecord['transaction_date'],
            'blockchain_hash' => $jsonRecord['blockchain_hash'] ?? null,
            'created_at' => $jsonRecord['created_at'],
        ];
    }
}

// Determine if JSON backup is valid
$jsonValid = empty($missingInJson) && empty($missingInDb) && empty($mismatchedData);

if (!$jsonValid) {
    if (!empty($missingInJson)) {
        $issues[] = count($missingInJson) . " records missing in JSON backup";
    }
    if (!empty($missingInDb)) {
        $issues[] = count($missingInDb) . " records in JSON but not in database (possibly deleted)";
    }
    if (!empty($mismatchedData)) {
        $issues[] = count($mismatchedData) . " records with mismatched data";
    }
}

$jsonVerification = [
    'valid' => $jsonValid,
    'total_json_records' => count($jsonRecords),
    'total_db_records' => count($dbRecords),
    'matched_records' => $matchedRecords,
    'missing_in_json' => $missingInJson,
    'missing_in_json_details' => $missingInJsonDetails,
    'missing_in_db' => $missingInDb,
    'missing_in_db_details' => $missingInDbDetails,
    'mismatched_data' => $mismatchedData,
    'mismatched_data_details' => $mismatchedDataDetails,
    'issues' => $issues,
];

echo "  ✓ JSON Backup Valid: " . ($jsonVerification['valid'] ? 'YES' : 'NO') . "\n";
echo "  ✓ Matched Records: {$jsonVerification['matched_records']}\n";
echo "  ✓ Missing in JSON: " . count($missingInJson) . "\n";
echo "  ✓ Missing in DB: " . count($missingInDb) . "\n";
echo "  ✓ Mismatched Data: " . count($mismatchedData) . "\n\n";

// Generate CSV report
echo "Step 3: Generating CSV report...\n";

$overallValid = $verification['chain_valid'] && $jsonVerification['valid'];

$csvContent = "BLOCKCHAIN VERIFICATION & AUDIT TRAIL REPORT\n";
$csvContent .= "Generated: " . now()->format('n/j/Y, g:i:s A') . "\n\n";
$csvContent .= "OVERALL STATUS\n";
$csvContent .= "=====================\n";
$csvContent .= "Status: " . ($overallValid ? 'VERIFIED' : 'FAILED') . "\n";
$csvContent .= "Overall Integrity: " . ($overallValid ? 'PASSED' : 'FAILED') . "\n\n";

$csvContent .= "BLOCKCHAIN VERIFICATION\n";
$csvContent .= "=====================\n";
$csvContent .= "Blockchain Status: " . ($verification['chain_valid'] ? 'Valid' : 'Invalid') . "\n";
$csvContent .= "Total Records in Chain: {$verification['total_records']}\n";
$csvContent .= "Verified Records: {$verification['verified_records']}\n";
$csvContent .= "Tampered Records: {$verification['tampered_records']}\n";
$csvContent .= "Verification Success Rate: " . ($verification['total_records'] > 0 ? number_format(($verification['verified_records'] / $verification['total_records']) * 100, 2) : 0) . "%\n\n";

$csvContent .= "JSON BACKUP AUDIT TRAIL\n";
$csvContent .= "=====================\n";
$csvContent .= "JSON Backup Status: " . ($jsonVerification['valid'] ? 'Valid' : 'Invalid') . "\n";
$csvContent .= "JSON Records Count: {$jsonVerification['total_json_records']}\n";
$csvContent .= "Database Records Count: {$jsonVerification['total_db_records']}\n";
$csvContent .= "Matched Records: {$jsonVerification['matched_records']}\n";
$csvContent .= "Missing in JSON: " . count($missingInJson) . "\n";
$csvContent .= "Missing in Database: " . count($missingInDb) . "\n";
$csvContent .= "Mismatched Data: " . count($mismatchedData) . "\n";
$csvContent .= "Cross-Check Success Rate: " . ($jsonVerification['total_json_records'] > 0 ? number_format(($jsonVerification['matched_records'] / $jsonVerification['total_json_records']) * 100, 2) : 0) . "%\n\n";

$csvContent .= "AUDIT TRAIL ANALYSIS\n";
$csvContent .= "=====================\n";
$csvContent .= "The system maintains a dual audit trail for financial records:\n\n";
$csvContent .= "1. DATABASE BLOCKCHAIN TRAIL:\n";
$csvContent .= "   - Each financial record has a blockchain hash\n";
$csvContent .= "   - Hashes are linked in a chain (each record references previous)\n";
$csvContent .= "   - Uses SHA-256 cryptographic hashing for security\n";
$csvContent .= "   - Any tampering with database records is detectable\n\n";
$csvContent .= "2. JSON FILE AUDIT TRAIL:\n";
$csvContent .= "   - Immutable encrypted JSON log file (location secured)\n";
$csvContent .= "   - Each transaction is appended to the file upon creation\n";
$csvContent .= "   - Contains complete record details including blockchain hashes\n";
$csvContent .= "   - Serves as independent verification source\n";
$csvContent .= "   - Cannot be modified through normal application flow\n\n";
$csvContent .= "CROSS-VERIFICATION PROCESS:\n";
$csvContent .= "   - System checks both database and JSON file\n";
$csvContent .= "   - Compares critical fields: amount, balance, blockchain_hash\n";
$csvContent .= "   - Detects missing records in either location\n";
$csvContent .= "   - Identifies data mismatches between sources\n";
$csvContent .= "   - Provides comprehensive integrity report\n\n\n";

// Add blockchain issues if any
if (!empty($verification['tampered_records_details'])) {
    $csvContent .= "BLOCKCHAIN ISSUES DETECTED\n";
    $csvContent .= "=====================\n";
    $csvContent .= "⚠️ WARNING: The following records have blockchain integrity failures.\n";
    $csvContent .= "This indicates potential data tampering or corruption.\n\n";

    foreach ($verification['tampered_records_details'] as $issue) {
        $csvContent .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        $csvContent .= "🔴 RECORD ID: {$issue['id']}\n";
        $csvContent .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

        // Basic Record Information
        $csvContent .= "RECORD DETAILS:\n";
        $csvContent .= "  Patient ID: {$issue['patient_id']}\n";
        $csvContent .= "  Amount: PHP " . number_format($issue['amount'], 2) . "\n";
        $csvContent .= "  Balance: PHP " . number_format($issue['balance'] ?? 0, 2) . "\n\n";

        // Issues Found
        $csvContent .= "ISSUES DETECTED:\n";
        foreach ($issue['issues'] as $problemDesc) {
            $csvContent .= "  ❌ {$problemDesc}\n";
        }
        $csvContent .= "\n";

        // Hash Verification Details
        $csvContent .= "HASH VERIFICATION DETAILS:\n";
        $csvContent .= "  Current Blockchain Hash (Stored in DB):\n";
        $csvContent .= "    " . ($issue['stored_hash'] ?? 'NULL') . "\n\n";

        $csvContent .= "  Expected Blockchain Hash (Calculated from data):\n";
        $csvContent .= "    " . ($issue['expected_hash'] ?? 'NULL') . "\n\n";

        $csvContent .= "  Hash Match: " . ($issue['hash_match'] ? '✓ YES' : '❌ NO - TAMPERING DETECTED!') . "\n\n";

        // Previous Hash Link Verification
        $csvContent .= "CHAIN LINK VERIFICATION:\n";
        $csvContent .= "  Previous Hash (Stored):\n";
        $csvContent .= "    " . ($issue['stored_previous_hash'] ?? 'NULL') . "\n\n";

        $csvContent .= "  Previous Hash (Expected from prior record):\n";
        $csvContent .= "    " . ($issue['expected_previous_hash'] ?? 'NULL') . "\n\n";

        $csvContent .= "  Chain Link Match: " . ($issue['previous_hash_match'] ? '✓ YES' : '❌ NO - CHAIN BROKEN!') . "\n\n";

        // Data Used for Hash Calculation
        if (!empty($issue['data_used'])) {
            $csvContent .= "DATA FIELDS USED IN HASH CALCULATION:\n";
            $csvContent .= "  (These fields were combined and hashed to create the blockchain hash)\n\n";
            foreach ($issue['data_used'] as $field => $value) {
                $displayValue = is_null($value) ? 'NULL' : (is_string($value) ? $value : json_encode($value));
                $csvContent .= "  • {$field}: {$displayValue}\n";
            }
            $csvContent .= "\n";
        }

        // Diagnostic Information
        $csvContent .= "DIAGNOSTIC INFORMATION:\n";
        $csvContent .= "  How blockchain hashing works:\n";
        $csvContent .= "    1. Record data fields are combined into a JSON string\n";
        $csvContent .= "    2. SHA-256 hash is calculated from the JSON string\n";
        $csvContent .= "    3. This hash is combined with the previous record's hash\n";
        $csvContent .= "    4. Final blockchain hash = SHA-256(previous_hash + record_hash)\n\n";

        $csvContent .= "  Why this record failed:\n";
        if (!$issue['hash_match']) {
            $csvContent .= "    ⚠️  The stored hash doesn't match the recalculated hash\n";
            $csvContent .= "    ⚠️  This means the record data was modified after hash creation\n";
            $csvContent .= "    ⚠️  Possible tampering: amount, balance, or other fields changed\n";
        }
        if (!$issue['previous_hash_match']) {
            $csvContent .= "    ⚠️  The previous hash link is broken\n";
            $csvContent .= "    ⚠️  The chain integrity is compromised at this point\n";
            $csvContent .= "    ⚠️  Prior records may have been modified or deleted\n";
        }
        $csvContent .= "\n";

        // Recommended Actions
        $csvContent .= "RECOMMENDED ACTIONS:\n";
        $csvContent .= "  1. Compare this record with JSON backup to identify changes\n";
        $csvContent .= "  2. Check audit logs for who modified this record\n";
        $csvContent .= "  3. Investigate when the tampering occurred\n";
        $csvContent .= "  4. Consider restoring from JSON backup if available\n";
        $csvContent .= "  5. Run data integrity repair tool to fix blockchain\n\n";
    }

    $csvContent .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
}

// Add detailed JSON backup issues
if (!empty($jsonVerification['issues'])) {
    $csvContent .= "JSON BACKUP CROSS-CHECK ISSUES\n";
    $csvContent .= "=====================\n";
    foreach ($jsonVerification['issues'] as $idx => $issue) {
        $csvContent .= ($idx + 1) . ". {$issue}\n";
    }
    $csvContent .= "\n";

    // DETAILED: Records missing in JSON (exist in DB but not in JSON backup)
    if (!empty($jsonVerification['missing_in_json_details'])) {
        $csvContent .= "\nDETAILED: Records in Database but Missing in JSON Backup\n";
        $csvContent .= "-------------------------------------------------------------\n";
        $csvContent .= "These records exist in the database but are NOT in the JSON backup file.\n";
        $csvContent .= "This may indicate they were created after the last JSON backup.\n\n";

        foreach ($jsonVerification['missing_in_json_details'] as $record) {
            $csvContent .= "Record ID: {$record['id']}\n";
            $csvContent .= "  Patient ID: {$record['patient_id']}\n";
            $csvContent .= "  Amount: PHP " . number_format($record['amount'], 2) . "\n";
            $csvContent .= "  Balance: PHP " . number_format($record['balance'], 2) . "\n";
            $csvContent .= "  Transaction Date: {$record['transaction_date']}\n";
            $csvContent .= "  Blockchain Hash: " . ($record['blockchain_hash'] ?? 'N/A') . "\n";
            $csvContent .= "  Created At: {$record['created_at']}\n";
            $csvContent .= "  ⚠️  ACTION: This record should be backed up to JSON immediately!\n\n";
        }
    }

    // DETAILED: Records missing in DB (exist in JSON but not in database)
    if (!empty($jsonVerification['missing_in_db_details'])) {
        $csvContent .= "\nDETAILED: Records in JSON Backup but Missing in Database\n";
        $csvContent .= "-------------------------------------------------------------\n";
        $csvContent .= "These records exist in the JSON backup but are NOT in the database.\n";
        $csvContent .= "This indicates the records were DELETED from the database or database was reset.\n\n";

        foreach ($jsonVerification['missing_in_db_details'] as $record) {
            $csvContent .= "Record ID: {$record['id']}\n";
            $csvContent .= "  Patient ID: {$record['patient_id']}\n";
            $csvContent .= "  Amount: PHP " . number_format($record['amount'], 2) . "\n";
            $csvContent .= "  Balance: PHP " . number_format($record['balance'], 2) . "\n";
            $csvContent .= "  Transaction Date: {$record['transaction_date']}\n";
            $csvContent .= "  Blockchain Hash: " . ($record['blockchain_hash'] ?? 'N/A') . "\n";
            $csvContent .= "  Created At: {$record['created_at']}\n";
            $csvContent .= "  🔴 STATUS: DELETED from database\n";
            $csvContent .= "  ⚠️  ACTION: Consider restoring this record from JSON backup!\n\n";
        }
    }

    // DETAILED: Records with mismatched data
    if (!empty($jsonVerification['mismatched_data_details'])) {
        $csvContent .= "\nDETAILED: Records with Data Discrepancies (DB vs JSON)\n";
        $csvContent .= "-------------------------------------------------------------\n";
        $csvContent .= "These records exist in both DB and JSON but have different values.\n";
        $csvContent .= "This may indicate tampering or data corruption.\n\n";

        foreach ($jsonVerification['mismatched_data_details'] as $record) {
            $csvContent .= "Record ID: {$record['id']}\n";
            $csvContent .= "  Patient ID: {$record['patient_id']}\n";
            $csvContent .= "  Field Changes (JSON before vs DB after):\n";
            foreach ($record['field_changes'] as $field => $change) {
                $before = $change['before'] === null ? 'NULL' : $change['before'];
                $after = $change['after'] === null ? 'NULL' : $change['after'];
                $csvContent .= "    • {$field}:\n";
                $csvContent .= "      JSON (before): {$before}\n";
                $csvContent .= "      DB (after):   {$after}\n";
            }
            $csvContent .= "  🔴 STATUS: DATA MISMATCH DETECTED\n";
            $csvContent .= "  ⚠️  ACTION: Investigate immediately - possible tampering!\n\n";
        }
    }

    $csvContent .= "\n";
}

$csvContent .= "\n";
$csvContent .= "RECOMMENDATIONS\n";
$csvContent .= "=====================\n";
$csvContent .= "1. Continue regular verification schedules (recommended: daily)\n";
$csvContent .= "2. Maintain backup of critical records in multiple locations\n";
$csvContent .= "3. Monitor both database and JSON file for anomalies\n";
$csvContent .= "4. Investigate any mismatches immediately\n";
$csvContent .= "5. Keep JSON audit file secure and immutable\n";
$csvContent .= "6. Update security protocols quarterly\n\n";

$csvContent .= "SECURITY NOTES\n";
$csvContent .= "=====================\n";
$csvContent .= "- The dual audit trail system provides redundant security\n";
$csvContent .= "- JSON file serves as tamper-proof backup\n";
$csvContent .= "- Regular verification ensures data integrity\n";
$csvContent .= "- Any discrepancies should be investigated immediately\n";
$csvContent .= "- Keep both database and JSON file backups secure\n\n";

$csvContent .= "Generated by JTIMIS Blockchain Verification System\n";
$csvContent .= "Financial Records Audit Trail Module v2.0\n";

// Save to file
$reportsDir = storage_path('logs/blockchain_reports');
if (!is_dir($reportsDir)) {
    mkdir($reportsDir, 0755, true);
    file_put_contents($reportsDir . '/.gitignore', "*\n!.gitignore\n");
}

$filename = 'blockchain-audit-trail-report-' . now()->format('Y-m-d') . '.csv';
$filepath = $reportsDir . DIRECTORY_SEPARATOR . $filename;

file_put_contents($filepath, $csvContent);

echo "  ✓ Report saved to: {$filepath}\n\n";

echo "=============================================================\n";
echo "Report Summary:\n";
echo "  • Overall Status: " . ($overallValid ? '✓ VERIFIED' : '❌ FAILED') . "\n";
echo "  • Blockchain: " . ($verification['chain_valid'] ? '✓ Valid' : '❌ Invalid') . "\n";
echo "  • JSON Backup: " . ($jsonVerification['valid'] ? '✓ Valid' : '❌ Invalid') . "\n";
echo "  • File Location: {$filepath}\n";
echo "=============================================================\n";

exit($overallValid ? 0 : 1);
