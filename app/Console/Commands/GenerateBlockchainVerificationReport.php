<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BlockchainService;
use App\Models\User;

class GenerateBlockchainVerificationReport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'blockchain:generate-report {--user= : User ID who initiated the report (defaults to admin user)}';

    /**
     * The description of the console command.
     *
     * @var string
     */
    protected $description = 'Generate a detailed blockchain verification report with cross-check of JSON backup and database records. Shows exact tampered records with before/after comparison.';

    /**
     * Execute the console command.
     */
    public function handle(BlockchainService $blockchainService)
    {
        $this->info('Generating detailed blockchain verification report...');
        $this->newLine();

        // Get user ID
        $userId = $this->option('user');
        if (!$userId) {
            // Default to first admin user
            $adminUser = User::where('role', 'admin')->first();
            $userId = $adminUser?->id ?? null;
        }

        try {
            // Generate the detailed report
            $report = $blockchainService->generateDetailedVerificationReport($userId);

            if (!$report['success']) {
                $this->error('Failed to generate report:');
                foreach ($report['errors'] as $error) {
                    $this->error('  - ' . $error);
                }
                return 1;
            }

            // Display summary
            $this->info('✓ Report generated successfully!');
            $this->newLine();

            $summary = $report['summary'];
            $this->table(
                ['Metric', 'Count'],
                [
                    ['Total Database Records', $summary['total_db_records']],
                    ['Total JSON Records', $summary['total_json_records']],
                    ['Deleted Records', count($summary['deleted_records'])],
                    ['Edited Records', count($summary['edited_records'])],
                    ['Orphaned Records', count($summary['orphaned_records'])],
                    ['Integrity Violations', count($summary['integrity_violations'])],
                    ['Total Tampering Detected', $summary['total_tampering_detected']],
                ]
            );

            $this->newLine();

            // Display deleted records
            if (!empty($report['tampered_records_analysis']['deleted_records_detail'])) {
                $this->warn('DELETED RECORDS (existed in backup but removed from database):');
                $this->newLine();

                foreach ($report['tampered_records_analysis']['deleted_records_detail'] as $record) {
                    $this->line("  Record ID: {$record['id']}");
                    $this->line("    Patient: {$record['patient_name']} (ID: {$record['patient_id']})");
                    $this->line("    Amount: {$record['amount']}");
                    $this->line("    Transaction Date: {$record['transaction_date']}");
                    $this->line("    Status: {$record['status']}");
                    $this->line("    Detected: {$record['detected_at']}");
                    $this->newLine();
                }
            }

            // Display edited records
            if (!empty($report['tampered_records_analysis']['edited_records_detail'])) {
                $this->warn('EDITED RECORDS (data changed after creation):');
                $this->newLine();

                foreach ($report['tampered_records_analysis']['edited_records_detail'] as $record) {
                    $this->line("  Record ID: {$record['id']}");
                    $this->line("    Patient: {$record['patient_name']} (ID: {$record['patient_id']})");
                    $this->line("    Fields Modified: {$record['fields_count']}");

                    if (!empty($record['edited_fields'])) {
                        $this->line("    Field Changes:");
                        foreach ($record['edited_fields'] as $field => $change) {
                            $before = is_array($change['before']) ? json_encode($change['before']) : $change['before'];
                            $after = is_array($change['after']) ? json_encode($change['after']) : $change['after'];
                            $this->line("      • {$field}:");
                            $this->line("        Before: {$before}");
                            $this->line("        After:  {$after}");
                        }
                    }

                    if ($record['chain_violation']) {
                        $this->error("      ⚠ Chain violation detected!");
                    }

                    $this->line("    Detected: {$record['detected_at']}");
                    $this->newLine();
                }
            }

            // Display orphaned records
            if (!empty($report['tampered_records_analysis']['orphaned_records_detail'])) {
                $this->warn('ORPHANED RECORDS (exist in database but not in backup):');
                $this->newLine();

                foreach ($report['tampered_records_analysis']['orphaned_records_detail'] as $record) {
                    $this->line("  Record ID: {$record['id']}");
                    $this->line("    Patient: {$record['patient_name']} (ID: {$record['patient_id']})");
                    $this->line("    Amount: {$record['amount']}");
                    $this->line("    Transaction Date: {$record['transaction_date']}");
                    $this->line("    Status: {$record['status']}");
                    $this->line("    Detected: {$record['detected_at']}");
                    $this->newLine();
                }
            }

            // Display chain violations
            if (!empty($report['tampered_records_analysis']['chain_violations'])) {
                $this->error('BLOCKCHAIN CHAIN VIOLATIONS (integrity verification failures):');
                $this->newLine();

                foreach ($report['tampered_records_analysis']['chain_violations'] as $violation) {
                    $this->line("  Record ID: {$violation['id']}");
                    $this->line("    Patient ID: {$violation['patient_id']}");
                    $this->line("    Amount: {$violation['amount']}");
                    $this->line("    Issues:");
                    foreach ($violation['issues'] as $issue) {
                        $this->line("      - {$issue}");
                    }
                    $this->newLine();
                }
            }

            // Final status
            $this->newLine();
            if ($summary['total_tampering_detected'] === 0) {
                $this->info('✓ All integrity checks passed! No tampering detected.');
                return 0;
            } else {
                $this->error("⚠ WARNING: {$summary['total_tampering_detected']} tampering instances detected!");
                $this->line('Report saved to: storage/logs/verification_reports/');
                return 1;
            }

        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage());
            return 1;
        }
    }
}
