<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Services\BlockchainService;
use Illuminate\Support\Facades\App;

class FinancialRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'appointment_id',
        'amount',
        'balance',
        'is_partial_payment',
        'parent_record_id',
        'total_service_amount',
        'payment_method',
        'transaction_date',
        'description',
        'notes',
        'blockchain_hash',
        'previous_blockchain_hash',
        'is_verified',
        'verified_at',
        'verified_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance' => 'decimal:2',
        'total_service_amount' => 'decimal:2',
        'is_partial_payment' => 'boolean',
        'transaction_date' => 'date',
        'is_verified' => 'boolean',
        'verified_at' => 'datetime',
    ];

    // Relationships
    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    // Parent record relationship (for follow-up payments)
    public function parentRecord()
    {
        return $this->belongsTo(FinancialRecord::class, 'parent_record_id');
    }

    // Follow-up payment records (children)
    public function followUpPayments()
    {
        return $this->hasMany(FinancialRecord::class, 'parent_record_id');
    }

    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByPaymentMethod($query, $method)
    {
        return $query->where('payment_method', $method);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('transaction_date', [$startDate, $endDate]);
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('transaction_date', now()->month)
                    ->whereYear('transaction_date', now()->year);
    }

    public function scopeThisYear($query)
    {
        return $query->whereYear('transaction_date', now()->year);
    }

    public function scopeLastMonth($query)
    {
        return $query->whereMonth('transaction_date', now()->subMonth()->month)
                    ->whereYear('transaction_date', now()->subMonth()->year);
    }

    public function scopeHighValue($query, $amount = 500)
    {
        return $query->where('amount', '>', $amount);
    }

    /**
     * Scope: Get paid records (balance = 0)
     * Updated: payment_status column was dropped, now determined by balance
     */
    public function scopePaid($query)
    {
        return $query->where('balance', 0);
    }

    /**
     * Scope: Get overdue records (balance > 0 and updated > 30 days ago)
     * Updated: payment_status column was dropped, now determined by balance and age
     */
    public function scopeOverdue($query)
    {
        return $query->where('balance', '>', 0)
                     ->where('updated_at', '<', now()->subDays(30));
    }

    // Accessors
    public function getFormattedAmountAttribute()
    {
        return '₱' . number_format($this->amount, 2);
    }

    public function getFormattedDateAttribute()
    {
        return $this->transaction_date->format('M d, Y');
    }

    public function getPatientNameAttribute()
    {
        return $this->patient->name ?? 'Unknown';
    }

    public function getPaymentMethodDisplayAttribute()
    {
        return match($this->payment_method) {
            'credit_card' => 'Credit Card',
            'debit_card' => 'Debit Card',
            'bank_transfer' => 'Bank Transfer',
            default => ucfirst($this->payment_method ?? 'Not specified')
        };
    }

    public function isHighValue($threshold = 1000)
    {
        return $this->amount > $threshold;
    }

    public function isCashPayment()
    {
        return $this->payment_method === 'cash';
    }

    public function isCardPayment()
    {
        return in_array($this->payment_method, ['credit_card', 'debit_card']);
    }

    public function isInsurancePayment()
    {
        return $this->payment_method === 'insurance';
    }

    /**
     * Check if this financial record can be modified.
     * BLOCKCHAIN RULE: ALL records are immutable once created.
     * No modifications allowed - create new records for follow-up payments.
     *
     * @return bool Always returns false (immutable)
     */
    public function canBeModified()
    {
        return false; // Complete immutability
    }

    /**
     * Check if this record has been modified after creation
     *
     * @return bool True if updated_at > created_at + 5 seconds
     */
    public function hasBeenModified()
    {
        return $this->updated_at && $this->updated_at->gt($this->created_at->addSeconds(5));
    }

    /**
     * Get total amount paid across this record and all follow-up payments
     *
     * @return float Total amount paid
     */
    public function getTotalPaid()
    {
        if ($this->parent_record_id) {
            // This is a follow-up payment, get parent's total
            return $this->parentRecord ? $this->parentRecord->getTotalPaid() : $this->amount;
        }

        // Sum this record + all follow-up payments
        $total = (float) $this->amount;
        $total += $this->followUpPayments()->sum('amount');

        return $total;
    }

    /**
     * Get remaining balance for partial payments
     *
     * @return float Remaining balance
     */
    public function getRemainingBalance()
    {
        if (!$this->is_partial_payment) {
            return 0.0;
        }

        $totalPaid = $this->getTotalPaid();
        $totalAmount = (float) $this->total_service_amount;

        return max(0, $totalAmount - $totalPaid);
    }

    /**
     * Check if this partial payment needs follow-up payment
     *
     * @return bool True if balance remains
     */
    public function needsFollowUpPayment()
    {
        return $this->is_partial_payment && $this->getRemainingBalance() > 0;
    }

    /**
     * Get payment status determined by balance field
     * Updated: payment_status column was dropped, now determined automatically by balance
     */
    public function getPaymentStatusDisplayAttribute()
    {
        if ($this->balance == 0) {
            return 'Paid';
        } elseif ($this->balance < $this->amount) {
            return 'Partial';
        }
        return 'Pending';
    }

    // Helper methods - Updated to use balance field instead of payment_status column
    public function isPending()
    {
        return (float) $this->balance == (float) $this->amount;
    }

    public function isPaid()
    {
        return (float) $this->balance == 0;
    }

    public function isPartial()
    {
        return (float) $this->balance > 0 && (float) $this->balance < (float) $this->amount;
    }

    public function isOverdue()
    {
        // Check if it's past due date with remaining balance
        return (float) $this->balance > 0 && $this->updated_at && $this->updated_at->addDays(30)->isPast();
    }

    /**
     * Mark as paid by setting balance to 0
     * Updated: payment_status column was dropped, update balance field instead
     */
    public function markAsPaid($paymentMethod = null, $notes = null)
    {
        $updateData = ['balance' => 0];

        if ($paymentMethod) {
            $updateData['payment_method'] = $paymentMethod;
        }

        if ($notes) {
            $updateData['notes'] = $this->notes . "\n" . $notes;
        }

        return $this->update($updateData);
    }

    /**
     * Mark as partial by adjusting balance
     * Updated: payment_status column was dropped, update balance field instead
     */
    public function markAsPartial($paidAmount, $notes = null)
    {
        $updateData = ['balance' => max(0, $this->amount - $paidAmount)];

        if ($notes) {
            $updateData['notes'] = $this->notes . "\n" . $notes;
        }

        return $this->update($updateData);
    }

    /**
     * Mark as overdue (keep balance as is, just update notes)
     * Updated: payment_status column was dropped, overdue determined by balance > 0 and age
     */
    public function markAsOverdue($notes = null)
    {
        $updateData = [];

        if ($notes) {
            $updateData['notes'] = $this->notes . "\nMarked overdue: " . $notes;
        }

        return $this->update($updateData);
    }

    public function getDaysOverdue()
    {
        if (!$this->isOverdue()) {
            return 0;
        }

        return now()->diffInDays($this->transaction_date);
    }

    // Static methods for financial reporting
    public static function getTotalRevenue($startDate = null, $endDate = null)
    {
        $query = self::paid();

        if ($startDate && $endDate) {
            $query = $query->byDateRange($startDate, $endDate);
        }

        return $query->sum('amount');
    }

    public static function getOutstandingBalance()
    {
        // Source of truth: Appointment.balance represents the actual amount owed
        // (FinancialRecord.balance carries over from partial payments and can be misleading)
        return Appointment::sum('balance');
    }

    public static function getMonthlyRevenue($year = null, $month = null)
    {
        $year = $year ?? now()->year;
        $month = $month ?? now()->month;

        return self::paid()
                   ->whereYear('transaction_date', $year)
                   ->whereMonth('transaction_date', $month)
                   ->sum('amount');
    }

    public static function getPaymentMethodBreakdown($startDate = null, $endDate = null)
    {
        $query = self::paid();

        if ($startDate && $endDate) {
            $query = $query->byDateRange($startDate, $endDate);
        }

        return $query->selectRaw('payment_method, SUM(amount) as total, COUNT(*) as count')
                     ->groupBy('payment_method')
                     ->get();
    }

    public static function getOverdueRecords()
    {
        return self::overdue()->with('patient')->orderBy('transaction_date')->get();
    }

    // Financial summary
    public function getFinancialSummary()
    {
        return [
            'id' => $this->id,
            'patient_name' => $this->patient_name,
            'amount' => $this->formatted_amount,
            'status' => $this->status_display,
            'status_color' => $this->status_color,
            'payment_method' => $this->payment_method_display,
            'transaction_date' => $this->formatted_date,
            'description' => $this->description,
            'can_be_modified' => $this->canBeModified(),
        ];
    }

    // --- Blockchain Protection Methods ---

    /**
     * Relationship: User who verified this record
     */
    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * Check if this record is blockchain protected
     */
    public function isBlockchainProtected(): bool
    {
        return !empty($this->blockchain_hash);
    }

    /**
     * Check if this record is verified
     */
    public function isBlockchainVerified(): bool
    {
        return $this->is_verified === true;
    }

    /**
     * Check if this record is immutable (verified records cannot be modified)
     */
    public function isImmutable(): bool
    {
        return $this->is_verified === true;
    }

    /**
     * Verify this record's blockchain integrity
     */
    public function verifyBlockchain(): array
    {
        $blockchainService = App::make(BlockchainService::class);
        return $blockchainService->verifyFinancialRecord($this);
    }

    /**
     * Generate blockchain hash for this record
     */
    public function generateBlockchainHash(): string
    {
        $blockchainService = App::make(BlockchainService::class);
        return $blockchainService->generateFinancialRecordBlockchainHash($this);
    }

    /**
     * Get blockchain chain for this record
     */
    public function getBlockchainChain(): array
    {
        $blockchainService = App::make(BlockchainService::class);
        return $blockchainService->getFinancialRecordChain($this->id);
    }

    /**
     * Scope: Get only verified records
     */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    /**
     * Scope: Get unverified records (potential tampering)
     */
    public function scopeUnverified($query)
    {
        return $query->where('is_verified', false);
    }

    /**
     * Scope: Get blockchain protected records
     */
    public function scopeBlockchainProtected($query)
    {
        return $query->whereNotNull('blockchain_hash');
    }

    /**
     * Boot method to auto-generate blockchain hash on creation
     */
    protected static function boot()
    {
        parent::boot();

        // Skip blockchain operations during tests to avoid memory exhaustion
        if (app()->environment('testing')) {
            return;
        }

        // DISABLED: Auto-generate blockchain hash - this is handled in the controller to avoid timeouts
        // static::created(function ($record) {
        //     // Auto-generate blockchain hash when record is created
        //     try {
        //         $blockchainService = App::make(BlockchainService::class);
        //         $blockchainService->generateFinancialRecordBlockchainHash($record);
        //     } catch (\Exception $e) {
        //         // Log error but don't fail the creation
        //         \Log::error('Failed to generate blockchain hash for financial record: ' . $e->getMessage());
        //     }
        // });

        // DISABLED: Updated observer caused recursion - blockchain is handled in controller
        // static::updated(function ($record) {
        //     // Re-verify blockchain integrity after update
        //     try {
        //         $blockchainService = App::make(BlockchainService::class);
        //         $blockchainService->generateFinancialRecordBlockchainHash($record);
        //     } catch (\Exception $e) {
        //         \Log::error('Failed to update blockchain hash for financial record: ' . $e->getMessage());
        //     }
        // });
    }

    /**
     * Serialize the model to an array for API responses
     * Ensures transaction_date is formatted as YYYY-MM-DD to avoid timezone conversion
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Convert transaction_date to simple date string to avoid timezone conversion
        if (isset($array['transaction_date']) && $this->transaction_date instanceof \DateTimeInterface) {
            $array['transaction_date'] = $this->transaction_date->format('Y-m-d');
        }

        return $array;
    }
}
