<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\HashChainVerification;
use App\Models\FinancialRecord;
use App\Services\FinancialLogEncryptionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;

class BlockchainService
{
    /**
     * Calculates a SHA-256 hash for a given data array.
     * @param array $data
     * @return string
     */
    protected function calculateHash(array $data): string
    {
        // Sort keys to ensure consistent hashing, then encode to JSON
        $data['timestamp'] = Carbon::parse($data['timestamp'])->toDateTimeString();
        ksort($data);
        $dataString = json_encode($data);

        // Use a strong, non-reversible cryptographic hash function
        return hash('sha256', $dataString);
    }

    /**
     * Mines a new "block" (AuditLog entry) by calculating the hash based on the payload
     * and the previous block's hash.
     */
    protected function mineBlock(string $action, int $userId, string $userRole, string $collection, $recordId, array $details = []): AuditLog
    {
        // 1. Get the last log entry to establish the chain
        $lastLog = AuditLog::orderBy('id', 'desc')->first();
        $previousHash = $lastLog->current_hash ?? 'GENESIS';

        $timestamp = now();

        // 2. Prepare the data payload for hashing
        $payload = [
            'action' => $action,
            'performed_by' => $userId,
            'user_role' => $userRole,
            'target_collection' => $collection,
            'target_id' => $recordId,
            'details' => $details,
            'previous_hash' => $previousHash,
            'timestamp' => $timestamp,
        ];

        // 3. Calculate the new hash
        $currentHash = $this->calculateHash($payload);

        // 4. Create and save the new log entry (the "block")
        $log = AuditLog::create(array_merge($payload, [
            'current_hash' => $currentHash,
            'timestamp' => $timestamp,
            'is_verified' => true, // Mark as verified upon creation
        ]));

        return $log;
    }

    // --- Patient Record Specific Logging Functions ---

    public function recordPatientRecordCreated(int $userId, string $userRole, int $recordId, array $details)
    {
        return $this->mineBlock(
            'create',
            $userId,
            $userRole,
            'patient_records',
            $recordId,
            $details
        );
    }

    public function recordPatientRecordUpdated(int $userId, string $userRole, int $recordId, array $updatedFields)
    {
        return $this->mineBlock(
            'update',
            $userId,
            $userRole,
            'patient_records',
            $recordId,
            ['updated_fields' => $updatedFields]
        );
    }

    public function recordPatientRecordDeleted(int $userId, string $userRole, int $recordId, array $details)
    {
        return $this->mineBlock(
            'delete',
            $userId,
            $userRole,
            'patient_records',
            $recordId,
            $details
        );
    }

    public function recordPatientRecordAccessed(int $userId, string $userRole, int $recordId, string $patientName)
    {
        // This is a view/access event, typically not a full 'block' but still an audit log entry
        return $this->mineBlock(
            'access',
            $userId,
            $userRole,
            'patient_records',
            $recordId,
            ['patient_name' => $patientName, 'ip_address' => request()->ip()]
        );
    }

    // --- Chain Retrieval and Verification Functions ---

    /**
     * Gets the audit trail (chain) for a specific record.
     */
    public function getPatientRecordChain(int $recordId)
    {
        return AuditLog::where('target_collection', 'patient_records')
            ->where('target_id', $recordId)
            ->orderBy('id', 'asc')
            ->get();
    }

    /**
     * Verifies the integrity of the entire audit log chain.
     */
    public function verifyAuditLogChain(int $verifierId): array
    {
        $isChainValid = true;
        $tamperedRecords = [];
        $totalLogs = 0;
        $lastLogId = 0;
        $lastHash = null;

        // Process logs in chunks to avoid memory exhaustion
        AuditLog::orderBy('id', 'asc')->chunk(500, function ($logs) use (&$isChainValid, &$tamperedRecords, &$totalLogs, &$lastLogId, &$lastHash) {
            foreach ($logs as $log) {
                $totalLogs++;
                $expectedPreviousHash = $lastHash ?? 'GENESIS';

                // 1. Check Previous Hash Link
                if ($log->previous_hash !== $expectedPreviousHash) {
                    $isChainValid = false;
                    $tamperedRecords[] = ['id' => $log->id, 'reason' => 'Hash chain broken (previous hash mismatch)'];
                }

                // 2. Recalculate and Check Current Hash
                $dataToHash = [
                    'action' => $log->action,
                    'performed_by' => $log->performed_by,
                    'user_role' => $log->user_role,
                    'target_collection' => $log->target_collection,
                    'target_id' => $log->target_id,
                    'details' => $log->details,
                    'previous_hash' => $log->previous_hash,
                    'timestamp' => $log->timestamp,
                ];

                $recalculatedHash = $this->calculateHash($dataToHash);

                if ($recalculatedHash !== $log->current_hash) {
                    $isChainValid = false;
                    $tamperedRecords[] = ['id' => $log->id, 'reason' => 'Data altered (current hash mismatch)'];
                    $log->is_verified = false;
                    $log->save();
                } else {
                    $log->is_verified = true;
                    $log->save();
                }

                $lastHash = $log->current_hash;
                $lastLogId = $log->id;
            }
        });

        // Log the verification attempt
        HashChainVerification::create([
            'table_name' => 'audit_logs',
            'last_record_id' => $lastLogId,
            'last_hash' => $lastHash ?? 'N/A',
            'records_verified' => $totalLogs,
            'chain_valid' => $isChainValid,
            'tampering_detected' => $tamperedRecords,
            'verified_by' => $verifierId,
            'verified_at' => now(),
        ]);

        return [
            'chain_valid' => $isChainValid,
            'total_records' => $logs->count(),
            'tampered_records' => $tamperedRecords,
        ];
    }

    /**
     * Placeholder for other methods referenced in BlockchainController
     */
    public function getChainStatistics(): array
    {
        return [
            'total_blocks' => AuditLog::count(),
            'total_patient_records_logs' => AuditLog::where('target_collection', 'patient_records')->count(),
            'last_block_hash' => AuditLog::latest('id')->first()?->current_hash ?? 'N/A',
            'last_verification' => HashChainVerification::latest('verified_at')->first(),
        ];
    }

    // ... add exportChain, rebuildChainIntegrity, verifySingleRecord methods here as needed ...

    // --- Financial Record Specific Logging Functions ---

    protected function recordFinancialEvent(string $action, int $userId, string $userRole, int $recordId, array $details = []): AuditLog
    {
        return $this->mineBlock(
            $action,
            $userId,
            $userRole,
            'financial_records',
            $recordId,
            $details
        );
    }

    public function recordFinancialRecordCreated(int $userId, string $userRole, int $recordId, array $details = [])
    {
        return $this->recordFinancialEvent('create', $userId, $userRole, $recordId, $details);
    }

    public function recordFinancialRecordUpdated(int $userId, string $userRole, int $recordId, array $updatedFields = [])
    {
        return $this->recordFinancialEvent('update', $userId, $userRole, $recordId, [
            'updated_fields' => $updatedFields,
        ]);
    }

    public function recordFinancialRecordDeleted(int $userId, string $userRole, int $recordId, array $details = [])
    {
        return $this->recordFinancialEvent('delete', $userId, $userRole, $recordId, $details);
    }

    public function recordFinancialPaymentStatusChange(int $userId, string $userRole, int $recordId, string $status, ?string $method = null, ?string $notes = null)
    {
        return $this->recordFinancialEvent('payment_status', $userId, $userRole, $recordId, [
            'status' => $status,
            'payment_method' => $method,
            'notes' => $notes,
        ]);
    }

    public function recordFinancialTransaction(int $userId, string $userRole, int $recordId, string $status, ?string $description = null)
    {
        return $this->recordFinancialEvent('transaction', $userId, $userRole, $recordId, [
            'status' => $status,
            'description' => $description,
        ]);
    }

    // --- Financial Record Blockchain Protection Methods ---

    /**
     * Calculate blockchain hash for a financial record
     * This hash includes all critical financial data to detect tampering
     * Note: updated_at is excluded as it changes during verification
     */
    public function calculateFinancialRecordHash(FinancialRecord $record): string
    {
        $dataToHash = [
            'id' => $record->id,
            'patient_id' => $record->patient_id,
            'appointment_id' => $record->appointment_id,
            'amount' => (string) $record->amount,
            'balance' => (string) $record->balance,
            'is_partial_payment' => $record->is_partial_payment ? '1' : '0',
            'parent_record_id' => $record->parent_record_id ?? '',
            'total_service_amount' => (string) ($record->total_service_amount ?? ''),
            'payment_method' => $record->payment_method,
            'transaction_date' => $record->transaction_date->format('Y-m-d'),
            'description' => $record->description,
            'notes' => $record->notes ?? '',
            'created_at' => $record->created_at->toDateTimeString(),
        ];

        ksort($dataToHash);
        $dataString = json_encode($dataToHash, JSON_UNESCAPED_SLASHES);

        return hash('sha256', $dataString);
    }

    /**
     * Generate and store blockchain hash for a financial record
     * Links to previous financial record's hash to create a chain
     */
    public function generateFinancialRecordBlockchainHash(FinancialRecord $record): string
    {
        // Get the last financial record to link the chain
        $lastRecord = FinancialRecord::where('id', '<', $record->id)
            ->orderBy('id', 'desc')
            ->first();

        $previousHash = $lastRecord?->blockchain_hash ?? 'GENESIS_FINANCIAL';

        // Calculate hash including previous hash for chain integrity
        $recordHash = $this->calculateFinancialRecordHash($record);
        $chainHash = hash('sha256', $previousHash . $recordHash);

        // Use updateQuietly to prevent triggering the updated observer (avoid recursion)
        // Note: is_verified is NOT set here - records must be explicitly verified by admin
        $record->updateQuietly([
            'blockchain_hash' => $chainHash,
            'previous_blockchain_hash' => $previousHash,
        ]);

        // Refresh the model to sync in-memory data with database
        $record->refresh();

        return $chainHash;
    }

    /**
     * Verify a single financial record's integrity
     * BLOCKCHAIN RULE: ALL records are completely immutable
     * Any modification after creation is a violation
     */
    public function verifyFinancialRecord(FinancialRecord $record): array
    {
        $isValid = true;
        $issues = [];

        // 0. IMMUTABILITY CHECK: Allow updates only during initial verification (within reasonable time window)
        // - Records can be modified up to 10 seconds after creation for initial blockchain generation
        // - Subsequent modifications (verified_at to now) are allowed for background re-verification
        $creationWindow = $record->created_at->addSeconds(10);
        $isInitialSetup = $record->updated_at && $record->updated_at->lt($creationWindow);
        $isVerificationUpdate = $record->verified_at &&
                               $record->updated_at &&
                               abs($record->verified_at->diffInSeconds($record->updated_at)) <= 2;

        $hasBeenModified = $record->updated_at &&
                          $record->updated_at->gt($creationWindow) &&
                          !$isVerificationUpdate;

        if ($hasBeenModified) {
            $issues[] = 'IMMUTABILITY VIOLATION: Financial record was modified after creation. ALL records must remain immutable.';
            $issues[] = sprintf('Created: %s | Modified: %s',
                $record->created_at->toDateTimeString(),
                $record->updated_at->toDateTimeString()
            );
            $isValid = false;
        }

        // 1. Check if blockchain hash exists
        if (empty($record->blockchain_hash)) {
            return [
                'valid' => false,
                'issues' => ['Blockchain hash not found. Record may not be protected.'],
                'record_id' => $record->id,
                'stored_hash' => null,
                'expected_hash' => null,
                'previous_hash' => null,
                'data_used' => null,
            ];
        }

        // 2. Recalculate hash and compare
        $calculatedHash = $this->calculateFinancialRecordHash($record);
        $lastRecord = FinancialRecord::where('id', '<', $record->id)
            ->orderBy('id', 'desc')
            ->first();

        $expectedPreviousHash = $lastRecord?->blockchain_hash ?? 'GENESIS_FINANCIAL';
        $expectedChainHash = hash('sha256', $expectedPreviousHash . $calculatedHash);

        // Prepare data used for hash calculation for diagnostics
        $dataUsedForHash = [
            'id' => $record->id,
            'patient_id' => $record->patient_id,
            'appointment_id' => $record->appointment_id,
            'amount' => (string) $record->amount,
            'balance' => (string) $record->balance,
            'is_partial_payment' => $record->is_partial_payment ? '1' : '0',
            'parent_record_id' => $record->parent_record_id ?? '',
            'total_service_amount' => (string) ($record->total_service_amount ?? ''),
            'payment_method' => $record->payment_method,
            'transaction_date' => $record->transaction_date->format('Y-m-d'),
            'description' => $record->description,
            'notes' => $record->notes ?? '',
            'created_at' => $record->created_at->toDateTimeString(),
        ];

        if ($record->blockchain_hash !== $expectedChainHash) {
            $isValid = false;
            $issues[] = 'Blockchain hash mismatch. Data may have been tampered with.';
        }

        // 3. Check previous hash link
        if ($record->previous_blockchain_hash !== $expectedPreviousHash) {
            $isValid = false;
            $issues[] = 'Previous hash link broken. Chain integrity compromised.';
        }

        // Update verification status without changing updated_at timestamp
        $record->updateQuietly([
            'is_verified' => $isValid,
            'verified_at' => now(),
        ]);

        return [
            'valid' => $isValid,
            'issues' => $issues,
            'record_id' => $record->id,
            'calculated_hash' => $calculatedHash,
            'stored_hash' => $record->blockchain_hash,
            'expected_chain_hash' => $expectedChainHash,
            'expected_previous_hash' => $expectedPreviousHash,
            'stored_previous_hash' => $record->previous_blockchain_hash,
            'hash_match' => $record->blockchain_hash === $expectedChainHash,
            'previous_hash_match' => $record->previous_blockchain_hash === $expectedPreviousHash,
            'data_used' => $dataUsedForHash,
        ];
    }

    /**
     * Verify the entire financial records blockchain chain
     */
    public function verifyFinancialRecordsChain(?int $verifierId = null): array
    {
        $isChainValid = true;
        $tamperedRecords = [];
        $verifiedCount = 0;
        $totalRecords = 0;
        $lastRecordId = 0;
        $lastHash = null;

        // Process records in chunks to avoid memory exhaustion
        FinancialRecord::orderBy('id', 'asc')->chunk(500, function ($records) use (&$isChainValid, &$tamperedRecords, &$verifiedCount, &$totalRecords, &$lastRecordId, &$lastHash) {
            foreach ($records as $record) {
                $totalRecords++;
                $verification = $this->verifyFinancialRecord($record);

                if (!$verification['valid']) {
                    $isChainValid = false;
                    $tamperedRecords[] = [
                        'id' => $record->id,
                        'patient_id' => $record->patient_id,
                        'amount' => $record->amount,
                        'balance' => $record->balance,
                        'issues' => $verification['issues'],
                        'stored_hash' => $verification['stored_hash'] ?? null,
                        'expected_hash' => $verification['expected_chain_hash'] ?? null,
                        'calculated_hash' => $verification['calculated_hash'] ?? null,
                        'stored_previous_hash' => $verification['stored_previous_hash'] ?? null,
                        'expected_previous_hash' => $verification['expected_previous_hash'] ?? null,
                        'hash_match' => $verification['hash_match'] ?? false,
                        'previous_hash_match' => $verification['previous_hash_match'] ?? false,
                        'data_used' => $verification['data_used'] ?? null,
                    ];
                } else {
                    $verifiedCount++;
                }

                $lastRecordId = $record->id;
                $lastHash = $record->blockchain_hash;
            }
        });

        // Log verification attempt
        HashChainVerification::create([
            'table_name' => 'financial_records',
            'last_record_id' => $lastRecordId,
            'last_hash' => $lastHash ?? 'N/A',
            'records_verified' => $totalRecords,
            'chain_valid' => $isChainValid,
            'tampering_detected' => $tamperedRecords,
            'verified_by' => $verifierId,
            'verified_at' => now(),
        ]);

        return [
            'chain_valid' => $isChainValid,
            'total_records' => $totalRecords,
            'verified_records' => $verifiedCount,
            'tampered_records' => count($tamperedRecords),
            'tampered_records_details' => $tamperedRecords,
        ];
    }

    /**
     * Get blockchain chain for a specific financial record (audit trail)
     */
    public function getFinancialRecordChain(int $recordId): array
    {
        $record = FinancialRecord::findOrFail($recordId);
        $chain = [];

        // Get all records up to this one to show the chain
        $records = FinancialRecord::where('id', '<=', $recordId)
            ->orderBy('id', 'asc')
            ->get();

        foreach ($records as $r) {
            $chain[] = [
                'id' => $r->id,
                'patient_id' => $r->patient_id,
                'amount' => $r->amount,
                'blockchain_hash' => $r->blockchain_hash,
                'previous_blockchain_hash' => $r->previous_blockchain_hash,
                'is_verified' => $r->is_verified,
                'created_at' => $r->created_at,
            ];
        }

        return [
            'record' => $record,
            'chain' => $chain,
            'chain_length' => count($chain),
        ];
    }

    /**
     * Rebuild blockchain hashes for all financial records
     * Useful if hashes need to be regenerated
     */
    public function rebuildFinancialRecordsBlockchain(): array
    {
        $rebuilt = 0;
        $errors = [];
        $totalRecords = 0;

        // Process records in chunks to avoid memory exhaustion
        FinancialRecord::orderBy('id', 'asc')->chunk(500, function ($records) use (&$rebuilt, &$errors, &$totalRecords) {
            foreach ($records as $record) {
                $totalRecords++;
                try {
                    $this->generateFinancialRecordBlockchainHash($record);
                    $rebuilt++;
                } catch (\Exception $e) {
                    $errors[] = [
                        'record_id' => $record->id,
                        'error' => $e->getMessage(),
                    ];
                }
            }
        });

        return [
            'total_records' => $totalRecords,
            'rebuilt' => $rebuilt,
            'errors' => $errors,
        ];
    }

    /**
     * Get financial records blockchain statistics
     */
    public function getFinancialRecordsBlockchainStatistics(): array
    {
        $totalRecords = FinancialRecord::count();
        $verifiedRecords = FinancialRecord::where('is_verified', true)->count();
        $unverifiedRecords = FinancialRecord::where('is_verified', false)->count();
        $recordsWithHash = FinancialRecord::whereNotNull('blockchain_hash')->count();

        $lastVerification = HashChainVerification::where('table_name', 'financial_records')
            ->latest('verified_at')
            ->first();

        return [
            'total_financial_records' => $totalRecords,
            'verified_records' => $verifiedRecords,
            'unverified_records' => $unverifiedRecords,
            'records_with_blockchain_hash' => $recordsWithHash,
            'protection_coverage' => $totalRecords > 0 ? round(($recordsWithHash / $totalRecords) * 100, 2) : 0,
            'last_verification' => $lastVerification,
            'last_block_hash' => FinancialRecord::latest('id')->first()?->blockchain_hash ?? 'N/A',
        ];
    }

    /**
     * Repair data integrity by factory resetting database and restoring from JSON backup
     * This function deletes ALL existing records and restores from JSON backup (source of truth)
     *
     * @param int|null $performedBy User ID who initiated the repair
     * @return array Detailed repair report with logs
     */
    public function repairDataIntegrityFromJson(?int $performedBy = null): array
    {
        $jsonFilePath = FinancialLogEncryptionService::getSecureLogPath();

        $result = [
            'success' => false,
            'restored_records' => [],
            'deleted_records' => [],
            'restore_log' => [],
            'deletion_log' => [],
            'errors' => [],
            'summary' => [
                'total_db_records_before' => 0,
                'total_json_records' => 0,
                'records_deleted' => 0,
                'records_restored' => 0,
                'errors_encountered' => 0,
            ],
            'performed_at' => now()->toDateTimeString(),
            'performed_by' => $performedBy,
        ];

        try {
            // Check if JSON file exists
            if (!file_exists($jsonFilePath)) {
                $result['errors'][] = 'JSON backup file not found. Cannot perform repair.';
                return $result;
            }

            // Read JSON file (auto-decrypts)
            $jsonRecords = FinancialLogEncryptionService::readLogFile($jsonFilePath);

            if (empty($jsonRecords)) {
                $result['errors'][] = 'JSON backup file is empty or corrupted.';
                return $result;
            }

            $result['summary']['total_json_records'] = count($jsonRecords);

            // Get count of existing database records
            $result['summary']['total_db_records_before'] = FinancialRecord::count();

            Log::info('Data integrity repair started - FACTORY RESET MODE', [
                'db_records_before' => $result['summary']['total_db_records_before'],
                'json_records' => count($jsonRecords),
                'performed_by' => $performedBy,
            ]);

            // Use database transactions for atomic operations
            // Note: ALTER TABLE causes implicit commit in MySQL, so we use two transactions

            // TRANSACTION 1: Delete all existing records
            DB::transaction(function () use (&$result) {

                // STEP 1: Factory Reset - Delete ALL existing records
                $existingRecords = FinancialRecord::with(['patient', 'appointment.service'])->get();

                foreach ($existingRecords as $record) {
                    try {
                        $deletionLog = [
                            'record_id' => $record->id,
                            'patient_id' => $record->patient_id,
                            'patient_name' => $record->patient->name ?? 'N/A',
                            'amount' => (float)$record->amount,
                            'action' => 'factory_reset_deleted',
                            'deleted_at' => now()->toDateTimeString(),
                        ];

                        $result['deletion_log'][] = $deletionLog;
                        $result['deleted_records'][] = $record->id;

                        $record->delete();
                        $result['summary']['records_deleted']++;

                    } catch (\Exception $e) {
                        $result['errors'][] = sprintf(
                            'Failed to delete record ID %d: %s',
                            $record->id,
                            $e->getMessage()
                        );
                        $result['summary']['errors_encountered']++;
                    }
                }

                Log::info('Factory reset completed', [
                    'records_deleted' => $result['summary']['records_deleted'],
                ]);
            });

            // Reset auto-increment counter to start from 1 (outside transaction - DDL causes implicit commit)
            DB::statement('ALTER TABLE financial_records AUTO_INCREMENT = 1');
            Log::info('Auto-increment counter reset to 1');

            // TRANSACTION 2: Restore all records from JSON backup
            DB::transaction(function () use ($jsonRecords, &$result) {

                // STEP 2: Restore ALL records from JSON backup
                foreach ($jsonRecords as $jsonRecord) {
                    try {
                        if (!isset($jsonRecord['id'])) {
                            continue;
                        }

                        $restoreData = [
                            'id' => $jsonRecord['id'],
                            'patient_id' => $jsonRecord['patient_id'],
                            'appointment_id' => $jsonRecord['appointment_id'],
                            'amount' => $jsonRecord['amount'],
                            'balance' => $jsonRecord['balance'] ?? 0,
                            'payment_method' => $jsonRecord['payment_method'] ?? null,
                            'transaction_date' => $jsonRecord['transaction_date'],
                            'description' => $jsonRecord['description'],
                            'notes' => $jsonRecord['notes'] ?? null,
                            'blockchain_hash' => $jsonRecord['blockchain_hash'] ?? null,
                            'previous_blockchain_hash' => $jsonRecord['previous_hash'] ?? null,
                            'created_at' => $jsonRecord['created_at'] ?? now(),
                            'updated_at' => $jsonRecord['updated_at'] ?? now(),
                        ];

                        // Create the record
                        $newRecord = FinancialRecord::create($restoreData);

                        $restoreLog = [
                            'record_id' => $newRecord->id,
                            'patient_id' => $newRecord->patient_id,
                            'appointment_id' => $newRecord->appointment_id,
                            'amount' => (float)$newRecord->amount,
                            'balance' => (float)$newRecord->balance,
                            'payment_method' => $newRecord->payment_method,
                            'transaction_date' => $newRecord->transaction_date,
                            'description' => $newRecord->description,
                            'action' => 'restored_from_json',
                            'restored_at' => now()->toDateTimeString(),
                        ];

                        $result['restore_log'][] = $restoreLog;
                        $result['restored_records'][] = $newRecord->id;
                        $result['summary']['records_restored']++;

                        Log::info('Data integrity repair: Record restored', [
                            'record_id' => $newRecord->id,
                        ]);

                    } catch (\Exception $e) {
                        $result['errors'][] = sprintf(
                            'Failed to restore record ID %d: %s',
                            $jsonRecord['id'] ?? 'unknown',
                            $e->getMessage()
                        );
                        $result['summary']['errors_encountered']++;

                        Log::error('Data integrity repair: Failed to restore record', [
                            'record_id' => $jsonRecord['id'] ?? 'unknown',
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });

            // Create audit log for the repair operation (outside transaction to avoid conflicts)
            try {
                AuditLog::create([
                    'action' => 'data_integrity_repair_factory_reset',
                    'performed_by' => $performedBy ?? 0,
                    'user_role' => $performedBy ? (\App\Models\User::find($performedBy)->role ?? 'admin') : 'admin',
                    'target_collection' => 'financial_records',
                    'target_id' => 0,
                    'details' => [
                        'records_deleted' => $result['summary']['records_deleted'],
                        'records_restored' => $result['summary']['records_restored'],
                        'performed_at' => now()->toDateTimeString(),
                    ],
                    'previous_hash' => AuditLog::orderBy('id', 'desc')->first()?->current_hash ?? 'GENESIS',
                    'timestamp' => now(),
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to create audit log for factory reset: ' . $e->getMessage());
            }

            $result['success'] = $result['summary']['errors_encountered'] === 0;

            // Save repair report to storage
            $this->saveIntegrityRepairReport($result);

            Log::info('Data integrity repair completed - Factory reset and restore', [
                'records_deleted' => $result['summary']['records_deleted'],
                'records_restored' => $result['summary']['records_restored'],
                'errors' => $result['summary']['errors_encountered'],
            ]);

        } catch (\Exception $e) {
            $result['errors'][] = 'Fatal error during repair: ' . $e->getMessage();
            $result['success'] = false;

            Log::error('Data integrity repair: Fatal error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }

        return $result;
    }

    /**
     * Save integrity repair report to a log file
     *
     * @param array $report The repair report
     * @return bool Success status
     */
    protected function saveIntegrityRepairReport(array $report): bool
    {
        try {
            $reportsDir = storage_path('logs/integrity_repairs');

            if (!is_dir($reportsDir)) {
                mkdir($reportsDir, 0755, true);
                file_put_contents($reportsDir . '/.gitignore', "*\n!.gitignore\n");
            }

            $filename = 'integrity_repair_' . now()->format('Y-m-d_His') . '.json';
            $filepath = $reportsDir . DIRECTORY_SEPARATOR . $filename;

            $reportContent = json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

            return file_put_contents($filepath, $reportContent) !== false;
        } catch (\Exception $e) {
            Log::error('Failed to save integrity repair report: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get all integrity repair reports
     *
     * @return array List of repair reports
     */
    public function getIntegrityRepairReports(): array
    {
        $reportsDir = storage_path('logs/integrity_repairs');

        if (!is_dir($reportsDir)) {
            return [];
        }

        $reports = [];
        $files = glob($reportsDir . '/integrity_repair_*.json');

        // Sort by newest first
        usort($files, function ($a, $b) {
            return filemtime($b) - filemtime($a);
        });

        foreach ($files as $file) {
            try {
                $content = file_get_contents($file);
                $report = json_decode($content, true);

                if ($report) {
                    $reports[] = [
                        'filename' => basename($file),
                        'filepath' => $file,
                        'created_at' => date('Y-m-d H:i:s', filemtime($file)),
                        'summary' => $report['summary'] ?? [],
                        'performed_by' => $report['performed_by'] ?? null,
                    ];
                }
            } catch (\Exception $e) {
                Log::warning('Failed to read integrity repair report: ' . $file);
            }
        }

        return $reports;
    }

    /**
     * Generate a detailed verification report with cross-check between JSON and database
     * Shows exact records tampered with, whether deleted or edited, with before/after comparison
     *
     * @param int|null $verifierId User ID who initiated the verification
     * @return array Detailed verification report with tampered records analysis
     */
    public function generateDetailedVerificationReport(?int $verifierId = null): array
    {
        $report = [
            'generated_at' => now()->toDateTimeString(),
            'generated_by' => $verifierId,
            'summary' => [
                'total_db_records' => 0,
                'total_json_records' => 0,
                'deleted_records' => [],
                'edited_records' => [],
                'orphaned_records' => [],
                'integrity_violations' => [],
                'total_tampering_detected' => 0,
            ],
            'cross_check_statistics' => [
                'total_matching_records' => 0,
                'total_records_with_differences' => 0,
                'total_deleted_records' => 0,
                'total_orphaned_records' => 0,
                'total_chain_violations' => 0,
                'integrity_match_percentage' => 0,
                'hash_validation_match_count' => 0,
                'hash_validation_failed_count' => 0,
                'data_integrity_status' => 'UNKNOWN',
            ],
            'tampered_records_analysis' => [
                'deleted_records_detail' => [],
                'edited_records_detail' => [],
                'orphaned_records_detail' => [],
                'chain_violations' => [],
            ],
            'errors' => [],
            'success' => true,
        ];

        try {
            // Read JSON backup file
            $jsonFilePath = FinancialLogEncryptionService::getSecureLogPath();

            if (!file_exists($jsonFilePath)) {
                $report['errors'][] = 'JSON backup file not found. Cannot perform detailed comparison.';
                $report['success'] = false;
                return $report;
            }

            $jsonRecords = FinancialLogEncryptionService::readLogFile($jsonFilePath);

            if (empty($jsonRecords)) {
                $report['errors'][] = 'JSON backup file is empty or corrupted.';
                $report['success'] = false;
                return $report;
            }

            // Get database records
            $dbRecords = FinancialRecord::with(['patient', 'appointment.service'])
                ->orderBy('id', 'asc')
                ->get()
                ->keyBy('id');

            $report['summary']['total_db_records'] = $dbRecords->count();
            $report['summary']['total_json_records'] = count($jsonRecords);

            // Create map of JSON records by ID for easy lookup
            $jsonRecordsMap = [];
            foreach ($jsonRecords as $jsonRecord) {
                if (isset($jsonRecord['id'])) {
                    $jsonRecordsMap[$jsonRecord['id']] = $jsonRecord;
                }
            }

            // ANALYSIS 1: Find deleted records (exist in JSON but not in DB)
            foreach ($jsonRecordsMap as $recordId => $jsonRecord) {
                if (!isset($dbRecords[$recordId])) {
                    // Record was deleted from database
                    $deletedRecord = [
                        'id' => $recordId,
                        'patient_id' => $jsonRecord['patient_id'] ?? 'N/A',
                        'patient_name' => $jsonRecord['patient_name'] ?? 'N/A',
                        'appointment_id' => $jsonRecord['appointment_id'] ?? null,
                        'amount' => $jsonRecord['amount'] ?? null,
                        'balance' => $jsonRecord['balance'] ?? null,
                        'payment_method' => $jsonRecord['payment_method'] ?? null,
                        'transaction_date' => $jsonRecord['transaction_date'] ?? null,
                        'description' => $jsonRecord['description'] ?? null,
                        'notes' => $jsonRecord['notes'] ?? null,
                        'created_at' => $jsonRecord['created_at'] ?? null,
                        'blockchain_hash' => $jsonRecord['blockchain_hash'] ?? null,
                        'detected_at' => now()->toDateTimeString(),
                        'status' => 'DELETED_FROM_DATABASE',
                    ];

                    $report['tampered_records_analysis']['deleted_records_detail'][] = $deletedRecord;
                    $report['summary']['deleted_records'][] = $recordId;
                }
            }

            // ANALYSIS 2: Find edited records and chain violations (exist in both, compare content)
            $matchingRecordsCount = 0;
            $recordsWithDifferences = 0;
            $hashMatchCount = 0;
            $hashFailedCount = 0;

            foreach ($dbRecords as $dbRecord) {
                $recordId = $dbRecord->id;

                if (!isset($jsonRecordsMap[$recordId])) {
                    // Record exists in DB but not in JSON (orphaned)
                    $orphanedRecord = [
                        'id' => $recordId,
                        'patient_id' => $dbRecord->patient_id,
                        'patient_name' => $dbRecord->patient?->name ?? 'N/A',
                        'appointment_id' => $dbRecord->appointment_id,
                        'amount' => (float)$dbRecord->amount,
                        'balance' => (float)$dbRecord->balance,
                        'payment_method' => $dbRecord->payment_method,
                        'transaction_date' => $dbRecord->transaction_date?->format('Y-m-d'),
                        'description' => $dbRecord->description,
                        'notes' => $dbRecord->notes,
                        'created_at' => $dbRecord->created_at?->toDateTimeString(),
                        'blockchain_hash' => $dbRecord->blockchain_hash,
                        'detected_at' => now()->toDateTimeString(),
                        'status' => 'ORPHANED_IN_DATABASE',
                    ];

                    $report['tampered_records_analysis']['orphaned_records_detail'][] = $orphanedRecord;
                    $report['summary']['orphaned_records'][] = $recordId;
                    continue;
                }

                $jsonRecord = $jsonRecordsMap[$recordId];
                $fieldsChanged = [];

                // Compare critical fields
                $criticalFields = [
                    'patient_id',
                    'appointment_id',
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
                        'transaction_date' => $dbRecord->$field?->format('Y-m-d'),
                        'amount', 'balance' => (float)$dbRecord->$field,
                        default => $dbRecord->$field,
                    };

                    $jsonValue = match ($field) {
                        'transaction_date' => $jsonRecord[$field] ?? null,
                        'amount', 'balance' => isset($jsonRecord[$field]) && $jsonRecord[$field] !== null ? (float)$jsonRecord[$field] : null,
                        default => $jsonRecord[$field] ?? null,
                    };

                    // More strict comparison: both null is considered equal
                    if ($dbValue === null && $jsonValue === null) {
                        continue;
                    }

                    // Compare with loose equality for numeric values to avoid precision issues
                    if (in_array($field, ['amount', 'balance'])) {
                        if ((float)$dbValue === (float)$jsonValue) {
                            continue;
                        }
                    } else {
                        if ($dbValue === $jsonValue) {
                            continue;
                        }
                    }

                    $fieldsChanged[$field] = [
                        'before' => $jsonValue,
                        'after' => $dbValue,
                        'type' => match ($field) {
                            'amount', 'balance' => 'monetary',
                            'transaction_date' => 'date',
                            'patient_id', 'appointment_id' => 'id',
                            default => 'text',
                        },
                    ];
                }

                // Check blockchain hash mismatch
                $chainViolation = false;
                if ($dbRecord->blockchain_hash !== ($jsonRecord['blockchain_hash'] ?? null)) {
                    $chainViolation = true;
                    $hashFailedCount++;
                } else {
                    $hashMatchCount++;
                }

                // Filter to only critical fields that matter for reporting
                $reportableFieldsChanged = [];
                $reportableFields = ['amount', 'patient_id', 'appointment_id', 'id', 'balance',
                                      'payment_method', 'transaction_date', 'description', 'notes',
                                      'blockchain_hash', 'previous_blockchain_hash'];

                foreach ($reportableFields as $field) {
                    if (isset($fieldsChanged[$field])) {
                        $reportableFieldsChanged[$field] = $fieldsChanged[$field];
                    }
                }

                // Filter to only CRITICAL display fields (must match dashboard filtering)
                // Dashboard only shows records with changes in: amount, patient_id, appointment_id, id
                $criticalDisplayFields = ['amount', 'patient_id', 'appointment_id', 'id'];
                $hasCriticalChange = false;
                foreach ($criticalDisplayFields as $field) {
                    if (isset($reportableFieldsChanged[$field])) {
                        $hasCriticalChange = true;
                        break;
                    }
                }

                // Only count records with changes in critical display fields OR chain violations
                if ($hasCriticalChange || $chainViolation) {
                    $recordsWithDifferences++;
                    $editedRecord = [
                        'id' => $recordId,
                        'patient_id' => $dbRecord->patient_id,
                        'patient_name' => $dbRecord->patient?->name ?? 'N/A',
                        'appointment_id' => $dbRecord->appointment_id,
                        'status' => 'EDITED_IN_DATABASE',
                        'edited_fields' => $reportableFieldsChanged,
                        'fields_count' => count($reportableFieldsChanged),
                        'chain_violation' => $chainViolation,
                        'detected_at' => now()->toDateTimeString(),
                        'current_state' => [
                            'amount' => (float)$dbRecord->amount,
                            'balance' => (float)$dbRecord->balance,
                            'payment_method' => $dbRecord->payment_method,
                            'transaction_date' => $dbRecord->transaction_date?->format('Y-m-d'),
                            'description' => $dbRecord->description,
                            'notes' => $dbRecord->notes,
                            'blockchain_hash' => $dbRecord->blockchain_hash,
                            'created_at' => $dbRecord->created_at?->toDateTimeString(),
                            'updated_at' => $dbRecord->updated_at?->toDateTimeString(),
                        ],
                    ];

                    $report['tampered_records_analysis']['edited_records_detail'][] = $editedRecord;
                    $report['summary']['edited_records'][] = $recordId;
                } else {
                    $matchingRecordsCount++;
                }
            }

            // ANALYSIS 3: Run blockchain chain verification
            $chainVerification = $this->verifyFinancialRecordsChain($verifierId);

            if (!$chainVerification['chain_valid'] && !empty($chainVerification['tampered_records_details'])) {
                $report['tampered_records_analysis']['chain_violations'] = $chainVerification['tampered_records_details'];
                $report['summary']['integrity_violations'] = array_map(function ($record) {
                    return $record['id'];
                }, $chainVerification['tampered_records_details']);
            }

            // Calculate cross-check statistics
            $totalCommonRecords = count($jsonRecordsMap) - count($report['summary']['deleted_records']);

            // Count records with displayable differences (amount, patient_id, appointment_id, id changes)
            $displayableChangedCount = 0;
            foreach ($report['tampered_records_analysis']['edited_records_detail'] as $edited) {
                // At this point, all records in edited_records_detail already have critical field changes
                // (filtered during collection above), so just count them
                if (!empty($edited['edited_fields']) || $edited['chain_violation']) {
                    $displayableChangedCount++;
                }
            }

            $report['cross_check_statistics']['total_matching_records'] = $matchingRecordsCount;
            $report['cross_check_statistics']['total_records_with_differences'] = $displayableChangedCount;
            $report['cross_check_statistics']['total_deleted_records'] = count($report['summary']['deleted_records']);
            $report['cross_check_statistics']['total_orphaned_records'] = count($report['summary']['orphaned_records']);
            $report['cross_check_statistics']['total_chain_violations'] = count($report['summary']['integrity_violations']);
            $report['cross_check_statistics']['hash_validation_match_count'] = $hashMatchCount;
            $report['cross_check_statistics']['hash_validation_failed_count'] = $hashFailedCount;

            // Calculate integrity match percentage based on displayable changes only
            $recordsToCheck = $totalCommonRecords - count($report['summary']['deleted_records']) -
                            count($report['summary']['orphaned_records']);
            if ($recordsToCheck > 0) {
                $integrityPercentage = round((($recordsToCheck - $displayableChangedCount) / $recordsToCheck) * 100, 2);
                $report['cross_check_statistics']['integrity_match_percentage'] = max(0, $integrityPercentage);
            } else {
                $report['cross_check_statistics']['integrity_match_percentage'] = 100;
            }

            // Recalculate tampering detected to only count displayable differences
            $report['summary']['total_tampering_detected'] =
                $displayableChangedCount +
                count($report['summary']['deleted_records']) +
                count($report['summary']['orphaned_records']) +
                count($report['summary']['integrity_violations']);

            // Determine overall data integrity status based on displayable changes only
            if ($displayableChangedCount === 0 &&
                count($report['summary']['deleted_records']) === 0 &&
                count($report['summary']['orphaned_records']) === 0 &&
                count($report['summary']['integrity_violations']) === 0) {
                $report['cross_check_statistics']['data_integrity_status'] = 'VERIFIED_INTACT';
            } elseif (count($report['summary']['deleted_records']) === 0 &&
                     count($report['summary']['integrity_violations']) === 0) {
                $report['cross_check_statistics']['data_integrity_status'] = 'MINOR_EDITS_DETECTED';
            } else {
                $report['cross_check_statistics']['data_integrity_status'] = 'CRITICAL_TAMPERING_DETECTED';
            }

            // Save detailed report to file
            $this->saveDetailedVerificationReport($report);

            // Log the generation
            Log::info('Detailed verification report generated', [
                'deleted_records' => count($report['summary']['deleted_records']),
                'edited_records' => count($report['summary']['edited_records']),
                'orphaned_records' => count($report['summary']['orphaned_records']),
                'total_tampering' => $report['summary']['total_tampering_detected'],
                'generated_by' => $verifierId,
            ]);

        } catch (\Exception $e) {
            $report['errors'][] = 'Error generating detailed verification report: ' . $e->getMessage();
            $report['success'] = false;
            Log::error('Detailed verification report error: ' . $e->getMessage());
        }

        return $report;
    }

    /**
     * Save detailed verification report to storage
     *
     * @param array $report The detailed verification report
     * @return bool Success status
     */
    protected function saveDetailedVerificationReport(array $report): bool
    {
        try {
            $reportsDir = storage_path('logs/verification_reports');

            if (!is_dir($reportsDir)) {
                mkdir($reportsDir, 0755, true);
                file_put_contents($reportsDir . '/.gitignore', "*\n!.gitignore\n");
            }

            $filename = 'verification_report_' . now()->format('Y-m-d_His') . '.json';
            $filepath = $reportsDir . DIRECTORY_SEPARATOR . $filename;

            $reportContent = json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

            return file_put_contents($filepath, $reportContent) !== false;
        } catch (\Exception $e) {
            Log::error('Failed to save detailed verification report: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get all detailed verification reports
     *
     * @return array List of verification reports with metadata
     */
    public function getDetailedVerificationReports(): array
    {
        $reportsDir = storage_path('logs/verification_reports');

        if (!is_dir($reportsDir)) {
            return [];
        }

        $reports = [];
        $files = glob($reportsDir . '/verification_report_*.json');

        // Sort by newest first
        usort($files, function ($a, $b) {
            return filemtime($b) - filemtime($a);
        });

        foreach ($files as $file) {
            try {
                $content = file_get_contents($file);
                $report = json_decode($content, true);

                if ($report) {
                    $reports[] = [
                        'filename' => basename($file),
                        'filepath' => $file,
                        'created_at' => date('Y-m-d H:i:s', filemtime($file)),
                        'generated_at' => $report['generated_at'] ?? null,
                        'summary' => $report['summary'] ?? [],
                        'generated_by' => $report['generated_by'] ?? null,
                        'success' => $report['success'] ?? false,
                    ];
                }
            } catch (\Exception $e) {
                Log::warning('Failed to read verification report: ' . $file);
            }
        }

        return $reports;
    }
}
