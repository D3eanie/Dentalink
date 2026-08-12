<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\FinancialRecord;
use App\Models\User;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Services\BlockchainService;
use App\Services\FinancialLogEncryptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FinancialRecordController extends Controller
{
    protected BlockchainService $blockchain;

    public function __construct(BlockchainService $blockchainService)
    {
        $this->blockchain = $blockchainService;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $isPatient = $user->isPatient();
        $patientId = $isPatient ? $user->id : null;

        $search = $request->input('search');
        $paymentMethod = $request->input('payment_method');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $page = $request->input('page', 1);

        // Base query with relationships
        $recordsQuery = FinancialRecord::with(['patient', 'appointment.service', 'verifier']);

        // If user is a patient, filter by their patient_id
        // Admins and staff see all records
        if ($isPatient) {
            $recordsQuery->where('patient_id', $patientId);
        }

        // Search functionality - for admins/staff, also search by patient name
        if ($search) {
            if ($isPatient) {
                // Patients can only search by description
                $recordsQuery->where('description', 'like', "%{$search}%");
            } else {
                // Admins/staff can search by description or patient name
                $recordsQuery->where(function ($query) use ($search) {
                    $query->where('description', 'like', "%{$search}%")
                          ->orWhereHas('patient', function ($q) use ($search) {
                              $q->where('name', 'like', "%{$search}%");
                          });
                });
            }
        }

        // Apply filters
        $recordsQuery->when($paymentMethod, function ($query, $paymentMethod) {
            return $query->where('payment_method', $paymentMethod);
        });

        $recordsQuery->when($dateFrom, function ($query, $dateFrom) {
            return $query->whereDate('transaction_date', '>=', $dateFrom);
        });

        $recordsQuery->when($dateTo, function ($query, $dateTo) {
            return $query->whereDate('transaction_date', '<=', $dateTo);
        });

        $records = $recordsQuery->orderBy('transaction_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15, ['*'], 'page', $page);

        // Calculate summary statistics
        $summaryQuery = FinancialRecord::query();
        if ($isPatient) {
            $summaryQuery->where('patient_id', $patientId);
        }

        // Calculate outstanding balance from appointments (source of truth)
        $appointmentBalanceQuery = Appointment::query();
        if ($isPatient) {
            $appointmentBalanceQuery->where('patient_id', $patientId);
        }
        $outstandingBalance = (clone $appointmentBalanceQuery)->sum('balance');

        $summary = [
            'total_revenue' => (clone $summaryQuery)->sum('amount'),
            'outstanding_balance' => $outstandingBalance,
            'pending_count' => (clone $summaryQuery)->where('balance', '>', 0)->where('amount', '<=', 0)->count(),
            'paid_count' => (clone $summaryQuery)->where('balance', '<=', 0)->count(),
            'overdue_count' => 0,
        ];

        // Calculate monthly revenue (current month) - paid transactions only
        $monthlyRevenueQuery = FinancialRecord::query();
        if ($isPatient) {
            $monthlyRevenueQuery->where('patient_id', $patientId);
        }
        $summary['monthly_revenue'] = (clone $monthlyRevenueQuery)
            ->whereMonth('transaction_date', now()->month)
            ->whereYear('transaction_date', now()->year)
            ->sum('amount');

        // DEBUG: Log the summary values
        Log::debug('FinancialRecordController - Summary calculation', [
            'total_revenue' => $summary['total_revenue'],
            'outstanding_balance' => $summary['outstanding_balance'],
            'monthly_revenue' => $summary['monthly_revenue'],
            'financial_records_count' => FinancialRecord::count(),
            'appointments_sum_balance' => Appointment::sum('balance'),
        ]);

        // Handle JSON requests for API calls (used by ApiAdmin, ApiStaff, ApiPatient)
        if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => true,
                'data' => $records->items(),
                'records' => $records->items(), // Alias for compatibility
                'summary' => $summary,
                'pagination' => [
                    'current_page' => $records->currentPage(),
                    'last_page' => $records->lastPage(),
                    'per_page' => $records->perPage(),
                    'total' => $records->total(),
                    'from' => $records->firstItem(),
                    'to' => $records->lastItem(),
                ],
            ]);
        }

        // Return for Inertia views (for patient dashboard)
        if ($isPatient) {
            return Inertia::render('Patient/Billing/Index', [
                'records' => $records,
                'summary' => $summary,
                'filters' => $request->only(['search', 'date_from', 'date_to']),
            ]);
        }

        // For admin/staff, this shouldn't be accessed via web routes typically,
        // but handle it just in case
        return Inertia::render('Admin/Financial/Index', [
            'records' => $records,
            'summary' => $summary,
            'filters' => $request->only(['search', 'payment_method', 'date_from', 'date_to']),
        ]);
    }

    public function create()
    {
        // ✅ FIX: Get ONLY patients (users with role='patient'), not all users
        $patients = User::where('role', 'patient')
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'email']); // Only select needed fields

        $appointments = Appointment::with(['patient', 'service'])
            ->where('status', 'completed')
            ->orderBy('appointment_date', 'desc')
            ->get();

        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'patients' => $patients,
                'appointments' => $appointments,
            ]);
        }

        return Inertia::render('FinancialRecords/Create', [
            'patients' => $patients,
            'appointments' => $appointments,
        ]);
    }

    public function store(Request $request)
    {
        // Increase memory limit for blockchain operations
        ini_set('memory_limit', '512M');

        $validated = $request->validate([
            'patient_id' => 'required|exists:users,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'nullable|in:cash,credit_card,debit_card,bank_transfer,insurance',
            'transaction_date' => 'required|date',
            'description' => 'required|string|max:255',
            'notes' => 'nullable|string',
            'parent_record_id' => 'nullable|exists:financial_records,id',
        ]);

        // Initialize balance and get service price from appointment if linked
        $servicePrice = 0;
        $appointment = null;
        if (!empty($validated['appointment_id'])) {
            $appointment = Appointment::with('service')->find($validated['appointment_id']);
            if ($appointment) {
                $servicePrice = (float) $appointment->calculateTotalServiceAmountFromToothRecords();
            }
        }

        // Balance starts with the full service price
        $balance = $servicePrice;
        $paidAmount = (float) $validated['amount'];

        // Determine if this is a partial payment
        $isPartialPayment = false;

        // Calculate remaining balance based on payment amount
        if ($paidAmount >= $balance && $balance > 0) {
            $validated['balance'] = 0;
        } elseif ($paidAmount > 0 && $paidAmount < $balance) {
            $validated['balance'] = $balance - $paidAmount;
            $isPartialPayment = true; // This is a partial payment
        } else {
            $validated['balance'] = $balance;
        }

        // Set partial payment fields
        $validated['is_partial_payment'] = $isPartialPayment;
        $validated['total_service_amount'] = $servicePrice > 0 ? $servicePrice : null;

        // Update description to indicate partial payment
        if ($isPartialPayment) {
            $validated['description'] = 'Partial payment for ' . $validated['description'];
        }

        // Use database transaction to ensure data consistency
        $record = DB::transaction(function () use ($validated, $appointment, $isPartialPayment) {
            $record = FinancialRecord::create($validated);

            // Load patient relationship for audit log
            $record->load('patient');

            if ($appointment) {
                $appointment->update([
                    'status' => 'completed',
                    'balance' => (float) $record->balance
                ]);

                if ($isPartialPayment) {
                    Log::info('Updated appointment balance for partial payment', [
                        'appointment_id' => $appointment->id,
                        'balance' => $record->balance,
                        'financial_record_id' => $record->id
                    ]);
                }
            }

            try {
                AuditLog::logCreate(Auth::id(), Auth::user()->role, 'financial_records', $record->id, [
                    'patient_name' => $record->patient->name ?? 'Unknown',
                    'amount' => $record->amount,
                    'balance' => $record->balance,
                    'is_partial_payment' => $record->is_partial_payment,
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to create audit log for financial record: ' . $e->getMessage());
                // Don't fail the transaction if audit log fails
            }

            return $record;
        });

        // Generate blockchain hash for the record (using updateQuietly to prevent recursion)
        try {
            $this->blockchain->generateFinancialRecordBlockchainHash($record);
        } catch (\Exception $e) {
            Log::warning('Failed to generate blockchain hash: ' . $e->getMessage());
        }

        // Write a copy of the financial record to JSON file in database folder
        try {
            $this->writeFinancialRecordToJson($record);
        } catch (\Exception $e) {
            Log::warning('Failed to write financial record to JSON file: ' . $e->getMessage());
        }

        // Notify patient about the new transaction
        try {
            $patient = $record->patient;
            if ($patient) {
                $message = "A new transaction of {$record->formatted_amount} has been created for: {$record->description}.";
                if ($record->is_partial_payment) {
                    $message .= " This is a partial payment. Remaining balance: ₱" . number_format($record->balance, 2);
                }

                Notification::createTransactionNotification(
                    $patient->id,
                    'New Transaction Created',
                    $message
                );
            }
        } catch (\Exception $e) {
            Log::warning('Failed to send transaction notification: ' . $e->getMessage());
        }

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Financial record created successfully.',
                'record' => $record->fresh()->load(['patient', 'appointment.service']),
            ], 201);
        }

        return redirect()->route('financial-records.index')
            ->with('success', 'Financial record created successfully.');
    }

    public function show($id)
    {
        $financialRecord = FinancialRecord::with(['patient', 'appointment.service', 'verifier'])->findOrFail($id);

        // Automatically verify blockchain integrity when viewing
        $verification = $this->blockchain->verifyFinancialRecord($financialRecord);
        $financialRecord->refresh();

        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'record' => $financialRecord,
                'blockchain_verification' => $verification,
            ]);
        }

        return Inertia::render('FinancialRecords/Show', [
            'record' => $financialRecord,
            'blockchain_verification' => $verification,
        ]);
    }

    public function edit($id)
    {
        $financialRecord = FinancialRecord::with(['patient', 'appointment', 'verifier'])->findOrFail($id);

        if (!$financialRecord->canBeModified()) {
            if (request()->expectsJson() || request()->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This financial record cannot be modified.',
                ], 403);
            }
            return back()->with('error', 'This financial record cannot be modified.');
        }

        // ✅ FIX: Get ONLY patients
        $patients = User::where('role', 'patient')
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'record' => $financialRecord,
                'patients' => $patients,
            ]);
        }

        return Inertia::render('FinancialRecords/Edit', [
            'record' => $financialRecord,
            'patients' => $patients,
        ]);
    }

    public function update(Request $request, $id)
    {
        $financialRecord = FinancialRecord::findOrFail($id);

        // VERIFIED RECORDS ARE IMMUTABLE: Protect blockchain integrity
        // Once a financial record is verified, it cannot be modified
        // For follow-up payments on partial payments, create a new linked record instead
        if ($financialRecord->isImmutable()) {
            Log::warning('Attempted to modify verified (immutable) financial record', [
                'record_id' => $id,
                'user_id' => Auth::id(),
                'is_verified' => $financialRecord->is_verified,
                'verified_at' => $financialRecord->verified_at,
                'verified_by' => $financialRecord->verified_by,
            ]);

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This financial record has been verified and is now immutable. Verified records cannot be modified to maintain blockchain integrity. To add a follow-up payment, create a new linked payment record instead.',
                ], 403);
            }
            return back()->with('error', 'Verified financial records cannot be modified. Create a follow-up payment record instead.');
        }

        $validated = $request->validate([
            'patient_id' => 'required|exists:users,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'nullable|in:cash,credit_card,debit_card,bank_transfer,insurance',
            'transaction_date' => 'required|date',
            'description' => 'required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        // Capture original values before update
        $originalAmount = $financialRecord->amount;

        // Use database transaction to ensure data consistency
        DB::transaction(function () use ($financialRecord, $validated) {
            $financialRecord->update($validated);

            try {
                AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'financial_records', $financialRecord->id, [
                    'updated_fields' => array_keys($validated),
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to create audit log for financial record update: ' . $e->getMessage());
                // Don't fail the transaction if audit log fails
            }
        });

        $this->blockchain->recordFinancialRecordUpdated(
            Auth::id(),
            Auth::user()->role,
            $financialRecord->id,
            $validated
        );

        // Notify patient about the transaction update
        try {
            $patient = $financialRecord->patient;
            if ($patient) {
                $amountChanged = isset($validated['amount']) && $validated['amount'] != $originalAmount;

                $message = "Your transaction has been updated.";
                if ($amountChanged) {
                    $message .= " Amount updated to: ₱" . number_format($validated['amount'], 2);
                }

                Notification::createTransactionNotification(
                    $patient->id,
                    'Transaction Updated',
                    $message
                );
            }
        } catch (\Exception $e) {
            Log::warning('Failed to send transaction update notification: ' . $e->getMessage());
        }

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Financial record updated successfully.',
                'record' => $financialRecord->fresh()->load(['patient', 'appointment.service']),
            ]);
        }

        return redirect()->route('financial-records.index')
            ->with('success', 'Financial record updated successfully.');
    }

    public function destroy($id)
    {
        $financialRecord = FinancialRecord::findOrFail($id);

        // VERIFIED RECORDS ARE IMMUTABLE: Protect blockchain integrity
        // Once a financial record is verified, it cannot be deleted
        if ($financialRecord->isImmutable()) {
            Log::warning('Attempted to delete verified (immutable) financial record', [
                'record_id' => $id,
                'user_id' => Auth::id(),
                'is_verified' => $financialRecord->is_verified,
                'verified_at' => $financialRecord->verified_at,
                'verified_by' => $financialRecord->verified_by,
            ]);

            if (request()->expectsJson() || request()->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This financial record has been verified and is now immutable. Verified records cannot be deleted to maintain blockchain integrity and audit trail.',
                ], 403);
            }
            return back()->with('error', 'Verified financial records cannot be deleted to maintain blockchain integrity.');
        }

        $patientName = $financialRecord->patient->name;
        $recordId = $financialRecord->id;

        AuditLog::logDelete(Auth::id(), Auth::user()->role, 'financial_records', $recordId, [
            'patient_name' => $patientName,
            'amount' => $financialRecord->amount,
        ]);

        $this->blockchain->recordFinancialRecordDeleted(
            Auth::id(),
            Auth::user()->role,
            $recordId,
            [
                'patient_id' => $financialRecord->patient_id,
                'amount' => $financialRecord->amount,
            ]
        );

        $financialRecord->delete();

        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Financial record deleted successfully.',
            ]);
        }

        return redirect()->route('financial-records.index')
            ->with('success', 'Financial record deleted successfully.');
    }

    /**
     * Calculate remaining balance for a partial payment
     */
    public function calculateRemainingBalance(Request $request, $id)
    {
        $financialRecord = FinancialRecord::with(['appointment.service'])->findOrFail($id);

        $recordBalance = (float) $financialRecord->balance;
        $appointmentBalance = (float) ($financialRecord->appointment?->balance ?? 0);
        $servicePrice = 0;
        $paidAmount = (float) $financialRecord->amount;

        // Get the service price from the appointment if available
        if ($financialRecord->appointment && $financialRecord->appointment->service) {
            $servicePrice = $financialRecord->appointment->service->price;
        }

        return response()->json([
            'success' => true,
            'remaining_balance' => $appointmentBalance, // Return appointment balance, not record balance
            'record_balance' => $recordBalance, // Include record balance for reference
            'appointment_balance' => $appointmentBalance, // Explicitly show appointment balance
            'total_service_price' => $servicePrice,
            'paid_amount' => $paidAmount,
        ]);
    }

    public function markAsPaid(Request $request, $id)
    {
        $financialRecord = FinancialRecord::findOrFail($id);

        $validated = $request->validate([
            'payment_method' => 'required|in:cash,credit_card,debit_card,bank_transfer,insurance',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $remainingBalance = (float) $financialRecord->balance;
            $newAmount = (float) $financialRecord->amount + $remainingBalance;

            $financialRecord->update([
                'amount' => $newAmount,
                'balance' => 0,
                'payment_method' => $validated['payment_method'],
                'notes' => trim(($financialRecord->notes ?? '') . "\n" . ($validated['notes'] ?? '')),
            ]);

            AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'financial_records', $financialRecord->id, [
                'action' => 'marked_as_paid',
                'payment_method' => $validated['payment_method'],
            ]);

            $this->blockchain->recordFinancialTransaction(
                Auth::id(),
                Auth::user()->role,
                $financialRecord->id,
                'paid',
                'Marked as paid'
            );

            // Check if all partial payments for this appointment are paid
            if ($financialRecord->appointment_id) {
                // Get all financial records for this appointment that are follow-up payments
                $appointment = Appointment::findOrFail($financialRecord->appointment_id);
                $appointment->update(['status' => 'fully_paid']);

                Log::info('Appointment #' . $appointment->id . ' status updated to fully_paid after mark as paid.', [
                    'appointment_id' => $appointment->id,
                ]);

                AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'appointments', $appointment->id, [
                    'action' => 'status_updated_to_fully_paid',
                    'reason' => 'Marked as paid',
                ]);
            }

            // Notify patient about payment confirmation
            try {
                $patient = $financialRecord->patient;
                if ($patient) {
                    $paymentMethod = ucfirst(str_replace('_', ' ', $validated['payment_method']));
                    Notification::createTransactionNotification(
                        $patient->id,
                        'Payment Confirmed',
                        "Your payment of {$financialRecord->formatted_amount} has been confirmed. Payment method: {$paymentMethod}"
                    );
                }
            } catch (\Exception $e) {
                Log::warning('Failed to send payment confirmation notification: ' . $e->getMessage());
            }

            DB::commit();

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Payment recorded successfully.',
                    'record' => $financialRecord->fresh()->load(['patient', 'appointment.service', 'verifier']),
                ]);
            }

            return back()->with('success', 'Payment recorded successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error marking payment as paid: ' . $e->getMessage());

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error recording payment: ' . $e->getMessage(),
                ], 500);
            }

            return back()->with('error', 'Error recording payment: ' . $e->getMessage());
        }
    }

    /**
     * Mark a financial record as verified by the admin
     */
    public function markAsVerified(Request $request, $id)
    {
        // Only admins can verify financial records
        if (!Auth::user()->isAdmin()) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only administrators can verify financial records.',
                ], 403);
            }
            return back()->with('error', 'Only administrators can verify financial records.');
        }

        $financialRecord = FinancialRecord::findOrFail($id);

        // Check if already verified
        if ($financialRecord->is_verified) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This financial record is already verified and immutable.',
                ]);
            }
            return back()->with('info', 'This financial record is already verified.');
        }

        try {
            DB::beginTransaction();

            // Mark as verified - this makes the record immutable
            $financialRecord->update([
                'is_verified' => true,
                'verified_by' => Auth::id(),
                'verified_at' => now(),
            ]);

            AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'financial_records', $financialRecord->id, [
                'action' => 'verified_by_admin',
                'verified_by' => Auth::user()->name,
            ]);

            $this->blockchain->recordFinancialTransaction(
                Auth::id(),
                Auth::user()->role,
                $financialRecord->id,
                'verified',
                'Verified by ' . Auth::user()->name
            );

            DB::commit();

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Record verified successfully. This record is now immutable.',
                    'record' => $financialRecord->fresh()->load(['patient', 'appointment.service', 'verifier']),
                ]);
            }

            return back()->with('success', 'Record verified successfully. This record is now immutable.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error marking financial record as verified: ' . $e->getMessage());

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error verifying record: ' . $e->getMessage(),
                ], 500);
            }

            return back()->with('error', 'Error verifying record: ' . $e->getMessage());
        }
    }

    /**
     * Create a follow-up payment transaction for partial payment
     */
    public function createPartialPaymentFollowUp(Request $request, $id)
    {
        $record = FinancialRecord::with(['patient', 'appointment.service', 'verifier'])->findOrFail($id);

        if (!$record->appointment_id) {
            return response()->json([
                'success' => false,
                'message' => 'Only transactions linked to an appointment can have follow-up payments.',
            ], 422);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,credit_card,debit_card,bank_transfer,insurance',
            'notes' => 'nullable|string',
        ]);

        // Check appointment's balance, not just the individual record's balance
        // The appointment may have multiple financial records, so we check the appointment's remaining balance
        $appointmentBalance = (float) ($record->appointment?->balance ?? 0);

        if ($appointmentBalance <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'This appointment is already fully paid. No additional payments are needed.',
            ], 422);
        }

        // Also validate against the amount to prevent overpaying
        if ((float) $validated['amount'] > $appointmentBalance) {
            return response()->json([
                'success' => false,
                'message' => 'Amount cannot exceed remaining appointment balance of ' . number_format($appointmentBalance, 2) . '.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            // IMMUTABLE ARCHITECTURE: Create a new follow-up payment record instead of modifying existing record
            // Calculate the parent record ID (use original parent if this is already a follow-up)
            $parentRecordId = $record->parent_record_id ?? $record->id;

            // Get the original description without "Partial payment for " prefix if present
            $originalDescription = $record->description;
            if (strpos($originalDescription, 'Partial payment for ') === 0) {
                $originalDescription = substr($originalDescription, strlen('Partial payment for '));
            }

            // Create a new transaction record for the follow-up payment
            $followUpRecord = FinancialRecord::create([
                'patient_id' => $record->patient_id,
                'appointment_id' => $record->appointment_id,
                'parent_record_id' => $parentRecordId,
                'amount' => (float) $validated['amount'],
                'balance' => 0,
                'is_partial_payment' => false, // Follow-up payments are not partial themselves
                'total_service_amount' => $record->total_service_amount,
                'payment_method' => $validated['payment_method'],
                'transaction_date' => now()->format('Y-m-d'),
                'description' => 'Follow-up payment for ' . $originalDescription,
                'notes' => $validated['notes'] ?? 'Completing partial payment',
            ]);

            // Generate blockchain hash for the new follow-up record
            try {
                $this->blockchain->generateFinancialRecordBlockchainHash($followUpRecord);
            } catch (\Exception $e) {
                Log::warning('Failed to generate blockchain hash for follow-up payment: ' . $e->getMessage());
            }

            // Calculate if fully paid by checking total of all related payments
            $parentRecord = $record->parent_record_id ? FinancialRecord::find($parentRecordId) : $record;
            $totalPaid = $parentRecord ? $parentRecord->getTotalPaid() : 0;
            $isFullyPaid = $parentRecord && $parentRecord->total_service_amount && $totalPaid >= (float)$parentRecord->total_service_amount;

            // Update appointment balance for follow-up payment
            if ($record->appointment) {
                $newAppointmentBalance = $isFullyPaid ? 0 : max(0, (float)$record->balance - (float)$validated['amount']);
                $record->appointment->update([
                    'balance' => $newAppointmentBalance
                ]);
                Log::info('Updated appointment balance after follow-up payment', [
                    'appointment_id' => $record->appointment_id,
                    'new_balance' => $newAppointmentBalance,
                    'fully_paid' => $isFullyPaid,
                ]);
            }

            $this->blockchain->recordFinancialTransaction(
                Auth::id(),
                Auth::user()->role,
                $followUpRecord->id,
                $isFullyPaid ? 'paid' : 'partial',
                'Follow-up payment: ₱' . number_format($validated['amount'], 2)
            );

            // Log the action
            AuditLog::logCreate(Auth::id(), Auth::user()->role, 'financial_records', $followUpRecord->id, [
                'action' => 'partial_payment_followup',
                'parent_record_id' => $parentRecordId,
                'payment_amount' => $validated['amount'],
                'fully_paid' => $isFullyPaid,
            ]);

            // Write the follow-up record to JSON audit log
            try {
                $this->writeFinancialRecordToJson($followUpRecord->fresh());
            } catch (\Exception $e) {
                Log::warning('Failed to write follow-up financial record to JSON file: ' . $e->getMessage());
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $isFullyPaid
                    ? 'Payment completed successfully. Balance is now fully paid.'
                    : 'Follow-up payment recorded successfully.',
                'record' => $record->fresh()->load(['patient', 'appointment.service']),
                'fully_paid' => $isFullyPaid,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating partial payment follow-up: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating follow-up transaction: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function reports(Request $request)
    {
        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());

        $reports = [
            'total_revenue' => FinancialRecord::getTotalRevenue($startDate, $endDate),
            'outstanding_balance' => FinancialRecord::getOutstandingBalance(),
            'payment_method_breakdown' => FinancialRecord::getPaymentMethodBreakdown($startDate, $endDate),
            'overdue_records' => FinancialRecord::getOverdueRecords(),
            'monthly_trends' => FinancialRecord::selectRaw('MONTH(transaction_date) as month, SUM(amount) as total')
                ->paid()
                ->whereYear('transaction_date', now()->year)
                ->groupBy('month')
                ->get(),
        ];

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'reports' => $reports,
                'dateRange' => ['start' => $startDate, 'end' => $endDate],
            ]);
        }

        return Inertia::render('FinancialRecords/Reports', [
            'reports' => $reports,
            'dateRange' => ['start' => $startDate, 'end' => $endDate],
        ]);
    }

    // --- Blockchain Verification Endpoints ---

    /**
     * Verify a single financial record's blockchain integrity
     */
    public function verifyRecord($id)
    {
        $financialRecord = FinancialRecord::findOrFail($id);
        $verification = $this->blockchain->verifyFinancialRecord($financialRecord);
        $financialRecord->refresh();

        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'success' => $verification['valid'],
                'verification' => $verification,
                'record' => $financialRecord,
            ]);
        }

        if ($verification['valid']) {
            return back()->with('success', 'Financial record verified successfully. No tampering detected.');
        } else {
            return back()->with('error', 'Tampering detected! ' . implode(', ', $verification['issues']));
        }
    }

    /**\n     * Verify all financial records blockchain chain and cross-check with JSON backup
     */
    public function verifyChain(Request $request)
    {
        $verification = $this->blockchain->verifyFinancialRecordsChain(Auth::id());

        // Cross-check with JSON file backup
        $jsonVerification = $this->crossCheckWithJsonBackup();

        // Get data integrity repair reports (last 5)
        $repairReports = $this->blockchain->getIntegrityRepairReports();
        $latestRepairs = array_slice($repairReports, 0, 5);

        // Combine both verification results
        $combinedVerification = array_merge($verification, [
            'json_backup_verification' => $jsonVerification,
            'overall_valid' => $verification['chain_valid'] && $jsonVerification['valid'],
            'data_integrity_repairs' => [
                'total_repairs' => count($repairReports),
                'latest_repairs' => $latestRepairs,
            ],
        ]);

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => $combinedVerification['overall_valid'],
                'verification' => $combinedVerification,
            ]);
        }

        if ($combinedVerification['overall_valid']) {
            $message = "Blockchain verified successfully! All {$verification['total_records']} financial records are intact. " .
                "JSON backup verification: {$jsonVerification['matched_records']}/{$jsonVerification['total_json_records']} records matched.";

            // Add info about previous repairs if any exist
            if (count($repairReports) > 0) {
                $message .= " Previous repairs: " . count($repairReports);
            }

            return back()->with('success', $message);
        } else {
            $errors = [];
            if (!$verification['chain_valid']) {
                $errors[] = "Blockchain: {$verification['tampered_records']} tampered records found";
            }
            if (!$jsonVerification['valid']) {
                $errors[] = "JSON Backup: " . implode(', ', $jsonVerification['issues']);
            }

            $errorMessage = "Verification failed! " . implode('. ', $errors);

            // Add suggestion to repair if admin
            if (Auth::user()->role === 'admin') {
                $errorMessage .= " Consider running data integrity repair to fix these issues.";
            }

            return back()->with('error', $errorMessage);
        }
    }

    /**
     * Get blockchain chain for a specific financial record
     */
    public function getBlockchainChain($id)
    {
        $chain = $this->blockchain->getFinancialRecordChain($id);

        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'chain' => $chain,
            ]);
        }

        return Inertia::render('FinancialRecords/BlockchainChain', [
            'chain' => $chain,
        ]);
    }

    /**
     * Get blockchain statistics for financial records
     */
    public function blockchainStatistics(Request $request)
    {
        $statistics = $this->blockchain->getFinancialRecordsBlockchainStatistics();

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'statistics' => $statistics,
            ]);
        }

        return Inertia::render('FinancialRecords/BlockchainStatistics', [
            'statistics' => $statistics,
        ]);
    }

    /**
     * Rebuild blockchain hashes for all financial records
     * Admin only - requires special permission
     */
    public function rebuildBlockchain(Request $request)
    {
        // Check if user is admin
        if (Auth::user()->role !== 'admin') {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Admin access required.',
                ], 403);
            }
            return back()->with('error', 'Unauthorized. Admin access required.');
        }

        $result = $this->blockchain->rebuildFinancialRecordsBlockchain();

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Blockchain rebuilt successfully. {$result['rebuilt']} records processed.",
                'result' => $result,
            ]);
        }

        return back()->with('success',
            "Blockchain rebuilt successfully. {$result['rebuilt']} records processed."
        );
    }

    /**
     * Repair data integrity by syncing database with JSON backup
     * Admin only - Uses JSON as source of truth to restore/update records
     */
    public function repairDataIntegrity(Request $request)
    {
        // Check if user is admin
        if (Auth::user()->role !== 'admin') {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Admin access required.',
                ], 403);
            }
            return back()->with('error', 'Unauthorized. Admin access required.');
        }

        // Perform data integrity repair
        $result = $this->blockchain->repairDataIntegrityFromJson(Auth::id());

        // Automatically rebuild blockchain and regenerate JSON if repair was successful
        if ($result['success'] && $result['summary']['records_restored'] > 0) {
            try {
                // Rebuild blockchain hashes
                $rebuildResult = $this->blockchain->rebuildFinancialRecordsBlockchain();
                $result['blockchain_rebuild'] = $rebuildResult;

                // Verify blockchain integrity
                $verifyResult = $this->blockchain->verifyFinancialRecordsChain();
                $result['blockchain_verification'] = $verifyResult;

                // Regenerate JSON backup file with new blockchain hashes
                $records = FinancialRecord::with(['patient', 'appointment.service', 'verifier'])->get();
                $jsonData = [];

                foreach ($records as $record) {
                    $jsonData[] = [
                        'id' => $record->id,
                        'patient_id' => $record->patient_id,
                        'appointment_id' => $record->appointment_id,
                        'amount' => (float)$record->amount,
                        'balance' => (float)$record->balance,
                        'payment_method' => $record->payment_method,
                        'transaction_date' => $record->transaction_date,
                        'description' => $record->description,
                        'notes' => $record->notes,
                        'blockchain_hash' => $record->blockchain_hash,
                        'previous_hash' => $record->previous_blockchain_hash,
                        'is_verified' => $record->is_verified,
                        'created_at' => $record->created_at->toDateTimeString(),
                        'updated_at' => $record->updated_at->toDateTimeString(),
                    ];
                }

                FinancialLogEncryptionService::writeLogFile(FinancialLogEncryptionService::getSecureLogPath(), $jsonData);
                $result['json_backup_regenerated'] = true;

            } catch (\Exception $e) {
                Log::error('Failed to rebuild blockchain after repair: ' . $e->getMessage());
                $result['blockchain_rebuild_error'] = $e->getMessage();
            }
        }

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => $result['success'],
                'message' => $result['success']
                    ? "Factory reset completed. {$result['summary']['records_deleted']} deleted, {$result['summary']['records_restored']} restored, blockchain rebuilt."
                    : "Factory reset failed. Check errors for details.",
                'result' => $result,
            ]);
        }

        if ($result['success']) {
            $message = "Factory reset completed successfully. ";
            $message .= "{$result['summary']['records_deleted']} record(s) deleted, ";
            $message .= "{$result['summary']['records_restored']} record(s) restored from JSON backup. ";

            if (isset($result['blockchain_rebuild'])) {
                $message .= "Blockchain hashes rebuilt successfully. ";
            }

            if ($result['summary']['records_restored'] > 0) {
                $message .= "Check the detailed report in storage/logs/integrity_repairs/.";
            }

            return back()->with('success', $message);
        } else {
            $errorMsg = "Factory reset failed. ";
            if (!empty($result['errors'])) {
                $errorMsg .= implode(', ', array_slice($result['errors'], 0, 3));
            }
            return back()->with('error', $errorMsg);
        }
    }

    /**
     * Get list of all data integrity repair reports
     * Admin only
     */
    public function getIntegrityRepairReports(Request $request)
    {
        // Check if user is admin
        if (Auth::user()->role !== 'admin') {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Admin access required.',
                ], 403);
            }
            return back()->with('error', 'Unauthorized. Admin access required.');
        }

        $reports = $this->blockchain->getIntegrityRepairReports();

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'reports' => $reports,
                'total_reports' => count($reports),
            ]);
        }

        return Inertia::render('FinancialRecords/IntegrityRepairReports', [
            'reports' => $reports,
        ]);
    }

    /**
     * Download a specific integrity repair report
     * Admin only
     */
    public function downloadIntegrityRepairReport(Request $request, $filename)
    {
        // Check if user is admin
        if (Auth::user()->role !== 'admin') {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Admin access required.',
                ], 403);
            }
            return back()->with('error', 'Unauthorized. Admin access required.');
        }

        $reportsDir = storage_path('logs/integrity_repairs');
        $filepath = $reportsDir . DIRECTORY_SEPARATOR . $filename;

        // Validate filename to prevent directory traversal
        if (!preg_match('/^integrity_repair_[\d_-]+\.json$/', $filename) || !file_exists($filepath)) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Report file not found.',
                ], 404);
            }
            return back()->with('error', 'Report file not found.');
        }

        return response()->download($filepath);
    }

    /**
     * Get pre-filled financial record form data from an appointment
     * Used when completing an appointment to show transaction form
     */
    public function getFormDataFromAppointment($appointmentId)
    {
        $appointment = Appointment::with(['patient', 'service'])->findOrFail($appointmentId);

        // Check if financial record already exists (do not block prefill)
        $existingRecord = FinancialRecord::where('appointment_id', $appointmentId)->first();

        // Pre-fill form data from appointment
        $amount = $appointment->calculateTotalServiceAmountFromToothRecords();

        $formData = [
            'patient_id' => $appointment->patient_id,
            'appointment_id' => $appointment->id,
            'amount' => (string) $amount,
            'payment_method' => '',
            'transaction_date' => now()->format('Y-m-d'),
            'description' => 'Service: ' . $appointment->service->name,
            'notes' => '',
        ];

        $patients = User::where('role', 'patient')
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return response()->json([
            'success' => true,
            'form_data' => $formData,
            'appointment' => $appointment,
            'patients' => $patients,
            'existing_record' => $existingRecord?->load(['patient', 'appointment.service']),
        ]);
    }

    /**
    * Write a copy of the financial record to the secure JSON audit log
     *
     * @param FinancialRecord $record
     * @return void
     */
    private function writeFinancialRecordToJson(FinancialRecord $record): void
    {
        $jsonFilePath = FinancialLogEncryptionService::getSecureLogPath();

        // Load relationships to include in the JSON
        $record->load(['patient', 'appointment.service']);

        // Prepare record data for JSON
        $recordData = [
            'id' => $record->id,
            'patient_id' => $record->patient_id,
            'patient_name' => $record->patient->name ?? null,
            'patient_email' => $record->patient->email ?? null,
            'appointment_id' => $record->appointment_id,
            'service_name' => $record->appointment->service->name ?? null,
            'amount' => $record->amount,
            'balance' => $record->balance,
            'is_partial_payment' => $record->is_partial_payment,
            'parent_record_id' => $record->parent_record_id,
            'total_service_amount' => $record->total_service_amount,
            'payment_method' => $record->payment_method,
            'transaction_date' => $record->transaction_date,
            'description' => $record->description,
            'notes' => $record->notes,
            'blockchain_hash' => $record->blockchain_hash,
            'previous_hash' => $record->previous_hash,
            'created_at' => $record->created_at ? $record->created_at->toISOString() : null,
            'updated_at' => $record->updated_at ? $record->updated_at->toISOString() : null,
            'logged_at' => now()->toISOString(),
        ];

        // Read existing data or initialize empty array (auto-decrypts when needed)
        $allRecords = FinancialLogEncryptionService::readLogFile($jsonFilePath);

        // Append new record
        $allRecords[] = $recordData;

        // Write back to file with encryption
        FinancialLogEncryptionService::writeLogFile($jsonFilePath, $allRecords);

        Log::info('Financial record written to secure audit log', [
            'record_id' => $record->id,
            'file_path' => $jsonFilePath,
        ]);
    }

    /**
     * Cross-check financial records between JSON backup file and database
     *
     * @return array Verification results
     */
    private function crossCheckWithJsonBackup(): array
    {
        $jsonFilePath = FinancialLogEncryptionService::getSecureLogPath();

        $result = [
            'valid' => true,
            'issues' => [],
            'total_json_records' => 0,
            'total_db_records' => 0,
            'matched_records' => 0,
            'missing_in_db' => [],
            'missing_in_json' => [],
            'mismatched_data' => [],
        ];

        // Get total database records
        $dbCount = FinancialRecord::count();

        // Check if JSON file exists
        if (!file_exists($jsonFilePath)) {
            // If no records exist in database, this is OK (clean state after factory reset)
            if ($dbCount === 0) {
                $result['valid'] = true;
                $result['issues'][] = 'No financial records to verify (clean state)';
                $result['total_db_records'] = 0;
                return $result;
            }

            // If records exist but no JSON file, this is an error
            $result['valid'] = false;
            $result['issues'][] = 'JSON backup file not found';
            return $result;
        }

        // Read JSON file (auto-decrypts when needed)
        try {
            $jsonRecords = FinancialLogEncryptionService::readLogFile($jsonFilePath);

            if (empty($jsonRecords) && file_exists($jsonFilePath) && filesize($jsonFilePath) > 0) {
                $result['valid'] = false;
                $result['issues'][] = 'JSON file is corrupted or invalid';
                return $result;
            }

            $result['total_json_records'] = count($jsonRecords);
        } catch (\Exception $e) {
            $result['valid'] = false;
            $result['issues'][] = 'Failed to read JSON file: ' . $e->getMessage();
            return $result;
        }

        // Get all financial records from database
        $dbRecords = FinancialRecord::all()->keyBy('id');
        $result['total_db_records'] = $dbRecords->count();

        // Create a map of JSON records by ID
        $jsonRecordsById = [];
        foreach ($jsonRecords as $jsonRecord) {
            if (isset($jsonRecord['id'])) {
                $jsonRecordsById[$jsonRecord['id']] = $jsonRecord;
            }
        }

        // Check each database record against JSON
        foreach ($dbRecords as $dbRecord) {
            if (!isset($jsonRecordsById[$dbRecord->id])) {
                $result['missing_in_json'][] = $dbRecord->id;
                $result['valid'] = false;
            } else {
                $jsonRecord = $jsonRecordsById[$dbRecord->id];

                // Compare critical fields
                $mismatch = false;
                $mismatchDetails = [];

                if ((float)$jsonRecord['amount'] !== (float)$dbRecord->amount) {
                    $mismatch = true;
                    $mismatchDetails[] = "amount: JSON={$jsonRecord['amount']}, DB={$dbRecord->amount}";
                }

                if ((float)($jsonRecord['balance'] ?? 0) !== (float)$dbRecord->balance) {
                    $mismatch = true;
                    $mismatchDetails[] = "balance: JSON={$jsonRecord['balance']}, DB={$dbRecord->balance}";
                }

                if ((string)$jsonRecord['patient_id'] !== (string)$dbRecord->patient_id) {
                    $mismatch = true;
                    $mismatchDetails[] = "patient_id: JSON={$jsonRecord['patient_id']}, DB={$dbRecord->patient_id}";
                }

                // Check new partial payment fields if present
                if (isset($jsonRecord['is_partial_payment']) && (bool)$jsonRecord['is_partial_payment'] !== (bool)$dbRecord->is_partial_payment) {
                    $mismatch = true;
                    $mismatchDetails[] = "is_partial_payment: JSON={$jsonRecord['is_partial_payment']}, DB={$dbRecord->is_partial_payment}";
                }

                if (isset($jsonRecord['parent_record_id']) && (int)($jsonRecord['parent_record_id'] ?? 0) !== (int)($dbRecord->parent_record_id ?? 0)) {
                    $mismatch = true;
                    $mismatchDetails[] = "parent_record_id: JSON={$jsonRecord['parent_record_id']}, DB={$dbRecord->parent_record_id}";
                }

                if (isset($jsonRecord['total_service_amount']) && (float)($jsonRecord['total_service_amount'] ?? 0) !== (float)($dbRecord->total_service_amount ?? 0)) {
                    $mismatch = true;
                    $mismatchDetails[] = "total_service_amount: JSON={$jsonRecord['total_service_amount']}, DB={$dbRecord->total_service_amount}";
                }

                if ($jsonRecord['blockchain_hash'] !== $dbRecord->blockchain_hash) {
                    $mismatch = true;
                    $mismatchDetails[] = "blockchain_hash mismatch";
                }

                if ($mismatch) {
                    $result['mismatched_data'][] = [
                        'record_id' => $dbRecord->id,
                        'details' => $mismatchDetails,
                    ];
                    $result['valid'] = false;
                } else {
                    $result['matched_records']++;
                }
            }
        }

        // Check for records in JSON but not in database
        foreach ($jsonRecordsById as $id => $jsonRecord) {
            if (!$dbRecords->has($id)) {
                $result['missing_in_db'][] = $id;
                // Note: This might not be an error if records were deleted
            }
        }

        // Build issues summary
        if (count($result['missing_in_json']) > 0) {
            $result['issues'][] = count($result['missing_in_json']) . ' records missing in JSON backup';
        }
        if (count($result['mismatched_data']) > 0) {
            $result['issues'][] = count($result['mismatched_data']) . ' records have mismatched data';
        }
        if (count($result['missing_in_db']) > 0) {
            $result['issues'][] = count($result['missing_in_db']) . ' records in JSON but not in database (possibly deleted)';
        }

        Log::info('JSON backup cross-check completed', $result);

        return $result;
    }

    /**
     * Update an existing financial record in the secure JSON audit log
     *
     * @param FinancialRecord $record
     * @return void
     */
    private function updateFinancialRecordInJson(FinancialRecord $record): void
    {
        $jsonFilePath = FinancialLogEncryptionService::getSecureLogPath();

        // Load relationships to include in the JSON
        $record->load(['patient', 'appointment.service']);

        // Prepare updated record data for JSON
        $recordData = [
            'id' => $record->id,
            'patient_id' => $record->patient_id,
            'patient_name' => $record->patient->name ?? null,
            'patient_email' => $record->patient->email ?? null,
            'appointment_id' => $record->appointment_id,
            'service_name' => $record->appointment->service->name ?? null,
            'amount' => $record->amount,
            'balance' => $record->balance,
            'payment_method' => $record->payment_method,
            'transaction_date' => $record->transaction_date,
            'description' => $record->description,
            'notes' => $record->notes,
            'blockchain_hash' => $record->blockchain_hash,
            'previous_hash' => $record->previous_hash,
            'created_at' => $record->created_at ? $record->created_at->toISOString() : null,
            'updated_at' => $record->updated_at ? $record->updated_at->toISOString() : null,
            'logged_at' => now()->toISOString(),
        ];

        // Read existing data or initialize empty array (auto-decrypts when needed)
        $allRecords = FinancialLogEncryptionService::readLogFile($jsonFilePath);

        // Find and update the existing record by ID
        $recordFound = false;
        foreach ($allRecords as $index => $existingRecord) {
            if (isset($existingRecord['id']) && $existingRecord['id'] === $record->id) {
                $allRecords[$index] = $recordData;
                $recordFound = true;
                break;
            }
        }

        // If record not found in JSON, append it (fallback for data integrity)
        if (!$recordFound) {
            $allRecords[] = $recordData;
            Log::warning('Financial record not found in JSON during update, appended instead', [
                'record_id' => $record->id,
            ]);
        }

        // Write back to file with encryption
        FinancialLogEncryptionService::writeLogFile($jsonFilePath, $allRecords);

        Log::info('Financial record updated in secure audit log', [
            'record_id' => $record->id,
            'file_path' => $jsonFilePath,
            'record_found' => $recordFound,
        ]);
    }
}
