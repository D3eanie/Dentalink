<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\BlockchainService;
use App\Models\AuditLog;
use App\Models\HashChainVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class BlockchainController extends Controller
{
    /**
     * Display blockchain overview
     */
    public function index(Request $request)
    {
        $statistics = BlockchainService::getChainStatistics();
        $recentVerifications = HashChainVerification::with('verifiedByUser')
            ->orderBy('verified_at', 'desc')
            ->limit(10)
            ->get();

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'statistics' => $statistics,
                'recent_verifications' => $recentVerifications,
            ]);
        }

        return Inertia::render('Blockchain/Index', [
            'statistics' => $statistics,
            'recentVerifications' => $recentVerifications,
        ]);
    }

    /**
     * Verify the entire audit log chain
     */
    public function verifyChain(Request $request)
    {
        try {
            $result = BlockchainService::verifyAuditLogChain(Auth::id());

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'verification_result' => $result,
                ]);
            }

            if ($result['chain_valid']) {
                return back()->with('success', "Blockchain verified successfully! All {$result['total_records']} records are intact.");
            } else {
                return back()->with('error', "Tampering detected! {$result['total_records']} records checked, found " . count($result['tampered_records']) . " tampered records.");
            }
        } catch (\Exception $e) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage(),
                ], 500);
            }

            return back()->with('error', 'Verification failed: ' . $e->getMessage());
        }
    }

    /**
     * Get chain details for a specific record
     */
    public function getRecordChain(Request $request)
    {
        $validated = $request->validate([
            'collection' => 'required|string',
            'record_id' => 'required|integer',
        ]);

        $chain = AuditLog::where('target_collection', $validated['collection'])
            ->where('target_id', $validated['record_id'])
            ->orderBy('id', 'asc')
            ->with('performedBy')
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'performed_by' => $log->performedBy?->name ?? 'Unknown',
                    'user_role' => $log->user_role,
                    'timestamp' => $log->timestamp,
                    'current_hash' => $log->current_hash,
                    'previous_hash' => $log->previous_hash,
                    'is_verified' => $log->is_verified,
                    'details' => $log->details,
                ];
            });

        return response()->json([
            'success' => true,
            'chain' => $chain,
            'total_records' => $chain->count(),
        ]);
    }

    /**
     * Verify a single record
     */
    public function verifySingleRecord(Request $request, $logId)
    {
        try {
            $result = BlockchainService::verifySingleRecord($logId);

            return response()->json([
                'success' => true,
                'verification' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Get suspicious activity (tampered records)
     */
    public function getSuspiciousActivity(Request $request)
    {
        $days = $request->input('days', 30);

        $suspicious = AuditLog::where('is_verified', false)
            ->where('timestamp', '>=', now()->subDays($days))
            ->with('performedBy')
            ->orderBy('timestamp', 'desc')
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'performed_by' => $log->performedBy?->name ?? 'Unknown',
                    'target' => $log->target_collection . ':' . $log->target_id,
                    'timestamp' => $log->timestamp,
                    'current_hash' => $log->current_hash,
                    'previous_hash' => $log->previous_hash,
                ];
            });

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'suspicious_records' => $suspicious,
                'count' => $suspicious->count(),
            ]);
        }

        return Inertia::render('Blockchain/SuspiciousActivity', [
            'suspicious_records' => $suspicious,
            'days' => $days,
        ]);
    }

    /**
     * Export blockchain for external verification
     */
    public function exportChain(Request $request)
    {
        $tableName = $request->input('table_name', 'audit_logs');
        $chainData = BlockchainService::exportChain($tableName);

        $fileName = "blockchain_export_{$tableName}_" . now()->format('Y-m-d_H-i-s') . ".json";

        return response()->json($chainData, 200, [
            'Content-Type' => 'application/json',
            'Content-Disposition' => "attachment; filename={$fileName}",
        ]);
    }

    /**
     * Rebuild chain integrity (ADMIN ONLY - use with caution)
     */
    public function rebuildChain(Request $request)
    {
        // Only allow admins to rebuild
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized. Only administrators can rebuild the chain.',
            ], 403);
        }

        try {
            $result = BlockchainService::rebuildChainIntegrity();

            if ($result['success']) {
                // Log this critical action
                AuditLog::create([
                    'action' => 'chain_rebuild',
                    'performed_by' => Auth::id(),
                    'user_role' => Auth::user()->role,
                    'target_collection' => 'audit_logs',
                    'target_id' => null,
                    'details' => [
                        'records_rebuilt' => $result['records_rebuilt'],
                        'reason' => $request->input('reason', 'Manual chain rebuild'),
                        'ip_address' => request()->ip(),
                    ],
                    'timestamp' => now(),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => $result['message'],
                    'records_rebuilt' => $result['records_rebuilt'],
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => $result['error'],
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get verification history
     */
    public function getVerificationHistory(Request $request)
    {
        $history = HashChainVerification::with('verifiedByUser')
            ->orderBy('verified_at', 'desc')
            ->paginate(20);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'history' => $history,
            ]);
        }

        return Inertia::render('Blockchain/VerificationHistory', [
            'history' => $history,
        ]);
    }

    /**
     * Get blockchain statistics dashboard
     */
    public function getStatistics(Request $request)
    {
        $stats = BlockchainService::getChainStatistics();

        // Additional statistics
        $stats['verifications_last_30_days'] = HashChainVerification::where('verified_at', '>=', now()->subDays(30))->count();
        $stats['failed_verifications'] = HashChainVerification::where('chain_valid', false)->count();
        $stats['last_successful_verification'] = HashChainVerification::where('chain_valid', true)
            ->latest('verified_at')
            ->first()?->verified_at;

        return response()->json([
            'success' => true,
            'statistics' => $stats,
        ]);
    }

    /**
     * Search audit logs
     */
    public function searchLogs(Request $request)
    {
        $query = AuditLog::with('performedBy');

        // Filters
        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        if ($request->has('user_id')) {
            $query->where('performed_by', $request->user_id);
        }

        if ($request->has('collection')) {
            $query->where('target_collection', $request->collection);
        }

        if ($request->has('date_from')) {
            $query->where('timestamp', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('timestamp', '<=', $request->date_to);
        }

        if ($request->has('verified_only')) {
            $query->where('is_verified', true);
        }

        if ($request->has('suspicious_only')) {
            $query->where('is_verified', false);
        }

        $logs = $query->orderBy('timestamp', 'desc')
            ->paginate($request->input('per_page', 50));

        return response()->json([
            'success' => true,
            'logs' => $logs,
        ]);
    }

    /**
     * Compare hashes
     */
    public function compareHashes(Request $request)
    {
        $validated = $request->validate([
            'hash1' => 'required|string',
            'hash2' => 'required|string',
        ]);

        $match = $validated['hash1'] === $validated['hash2'];

        return response()->json([
            'success' => true,
            'match' => $match,
            'hash1' => $validated['hash1'],
            'hash2' => $validated['hash2'],
        ]);
    }

    /**
     * Generate detailed verification report with cross-check of JSON and database
     * Shows exact tampered records with before/after comparison
     */
    public function generateDetailedVerificationReport(Request $request)
    {
        try {
            $blockchainService = app(BlockchainService::class);
            $report = $blockchainService->generateDetailedVerificationReport(Auth::id());

            return response()->json([
                'success' => $report['success'],
                'report' => $report,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get list of all detailed verification reports
     */
    public function getDetailedVerificationReports(Request $request)
    {
        try {
            $blockchainService = app(BlockchainService::class);
            $reports = $blockchainService->getDetailedVerificationReports();

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'reports' => $reports,
                    'count' => count($reports),
                ]);
            }

            return Inertia::render('Blockchain/DetailedVerificationReports', [
                'reports' => $reports,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * View a specific detailed verification report
     */
    public function viewDetailedVerificationReport(Request $request, $filename)
    {
        try {
            $validated = $request->validate([
                'filename' => 'required|string|regex:/^verification_report_[\d\-_]+\.json$/',
            ]);

            $reportPath = storage_path('logs/verification_reports/' . $filename);

            if (!file_exists($reportPath)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Report not found',
                ], 404);
            }

            $content = file_get_contents($reportPath);
            $report = json_decode($content, true);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'report' => $report,
                    'filename' => $filename,
                ]);
            }

            return Inertia::render('Blockchain/ViewDetailedReport', [
                'report' => $report,
                'filename' => $filename,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
