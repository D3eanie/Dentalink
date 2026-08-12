<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\FinancialRecord;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'service_id',
        'appointment_date',
        'appointment_time',
        'duration_minutes',
        'status',
        'checked_in_at',
        'booking_confirmed_at',
        'balance',
        'notes',
    ];

protected $casts = [
    'appointment_date' => 'date',
    'checked_in_at' => 'datetime',
    'booking_confirmed_at' => 'datetime',
    'balance' => 'decimal:2',
];

    // Relationships
    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function patientRecords()
    {
        return $this->hasMany(PatientRecord::class);
    }

    public function toothRecords()
    {
        return $this->hasMany(ToothRecord::class);
    }

    public function financialRecords()
    {
        return $this->hasMany(FinancialRecord::class);
    }

    // Scopes
    public function scopeUpcoming($query)
    {
        return $query->where('appointment_date', '>=', now())
                    ->where('status', '!=', 'cancelled');
    }

    public function scopeToday($query)
    {
        return $query->whereDate('appointment_date', today());
    }

    public function scopeTomorrow($query)
    {
        return $query->whereDate('appointment_date', now()->tomorrow());
    }

    public function scopeThisWeek($query)
    {
        return $query->whereBetween('appointment_date', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopePendingConfirmation($query)
    {
        return $query->where('status', 'pending_confirmation');
    }

    public function scopeRaceExpired($query)
    {
        // Returns pending appointments where 2 minutes have passed since creation
        return $query->where('status', 'pending_confirmation')
                    ->where('created_at', '<', now()->subMinutes(2));
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByDoctor($query, $doctorId)
    {
        return $query->where('doctor_id', $doctorId);
    }

    // FIXED: Accessors that properly handle time field
    public function getFormattedDateTimeAttribute()
    {
        return $this->appointment_date->format('M d, Y') . ' at ' .
               Carbon::createFromFormat('H:i:s', $this->appointment_time)->format('g:i A');
    }

    public function getFormattedDateAttribute()
    {
        return $this->appointment_date->format('M d, Y');
    }

    public function getFormattedTimeAttribute()
    {
        return Carbon::createFromFormat('H:i:s', $this->appointment_time)->format('g:i A');
    }

    public function getEstimatedEndTimeAttribute()
    {
        $time = Carbon::createFromFormat('H:i:s', $this->appointment_time);
        return $time->addMinutes($this->duration_minutes);
    }

    public function getStatusColorAttribute()
    {
        return match($this->status) {
            'scheduled' => 'blue',
            'confirmed' => 'green',
            'checked_in' => 'purple',
            'not_available' => 'yellow',
            'completed' => 'green',
            'cancelled' => 'red',
            'no_show' => 'gray',
            default => 'gray'
        };
    }

    // Helper methods
    public function isToday()
    {
        return $this->appointment_date->isToday();
    }

    public function isTomorrow()
    {
        return $this->appointment_date->isTomorrow();
    }

    public function isPast()
    {
        return $this->appointment_date->isPast();
    }

    public function isUpcoming()
    {
        return $this->appointment_date->isFuture() && $this->status !== 'cancelled';
    }

    // FIXED: canCheckIn method to properly handle time comparison
    public function canCheckIn()
    {
        if (!in_array($this->status, ['scheduled', 'confirmed'])) {
            return false;
        }

        // Allow check-in for same-day or future appointments.
        // Only block if the appointment date is already past.
        if ($this->appointment_date->isPast() && !$this->appointment_date->isToday()) {
            return false;
        }

        return true;
    }

public function canCancel()
{
    return in_array($this->status, ['scheduled', 'confirmed']) &&
           $this->appointment_date->isFuture();
}
    public function checkIn()
    {
        if ($this->canCheckIn()) {
            $this->update([
                'status' => 'checked_in',
                'checked_in_at' => now()
            ]);

            // Don't auto-create tooth records - staff will create them manually via the form
            // after checking in the patient

            return true;
        }
        return false;
    }

    /**
     * Create initial tooth records when appointment is checked in
     * The records will be pre-filled with appointment and service information
     */
    public function createInitialToothRecords()
    {
        try {
            // Load relationships if not already loaded
            if (!$this->relationLoaded('service')) {
                $this->load('service');
            }

            // Determine how many tooth records to create based on service
            $requiresMultipleTooth = $this->service && $this->service->requires_multiple_teeth
                ? 2  // Default to 2 for multi-tooth services
                : 1; // Default to 1 for single-tooth services

            // Create initial tooth records
            $toothNumber = 1; // Start with tooth 1 as default
            for ($i = 0; $i < $requiresMultipleTooth; $i++) {
                // For subsequent teeth, leave tooth_number empty so user must select
                $currentToothNumber = $i === 0 ? $toothNumber : null;

                ToothRecord::create([
                    'patient_id' => $this->patient_id,
                    'doctor_id' => $this->doctor_id,
                    'appointment_id' => $this->id,
                    'tooth_number' => $currentToothNumber,
                    'service' => $this->service->name ?? 'Unknown Service',
                    'date_done' => now()->toDateString(),
                    'notes' => 'Created from appointment check-in for ' . ($this->service->name ?? 'appointment'),
                ]);
            }

            Log::info('Initial tooth records created for appointment', [
                'appointment_id' => $this->id,
                'patient_id' => $this->patient_id,
                'records_created' => $requiresMultipleTooth,
                'service_requires_multiple' => $this->service && $this->service->requires_multiple_teeth ? 'yes' : 'no'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create initial tooth records for appointment check-in', [
                'appointment_id' => $this->id,
                'patient_id' => $this->patient_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Calculate total service amount based on tooth records for this appointment.
     * Falls back to the appointment service price when no tooth records exist.
     */
    public function calculateTotalServiceAmountFromToothRecords(): float
    {
        $records = $this->toothRecords()->get(['service']);

        if ($records->isEmpty()) {
            return (float) ($this->service?->price ?? 0);
        }

        $serviceNames = $records
            ->pluck('service')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $servicePriceMap = [];
        if (!empty($serviceNames)) {
            $services = Service::whereIn('name', $serviceNames)
                ->get(['name', 'price']);

            foreach ($services as $service) {
                $servicePriceMap[strtolower($service->name)] = (float) $service->price;
            }
        }

        $fallbackPrice = (float) ($this->service?->price ?? 0);
        $total = 0.0;

        foreach ($records as $record) {
            $serviceName = strtolower(trim((string) $record->service));
            $price = $serviceName !== '' && isset($servicePriceMap[$serviceName])
                ? $servicePriceMap[$serviceName]
                : $fallbackPrice;
            $total += $price;
        }

        return $total;
    }

    public function cancel($reason = null)
    {
        if ($this->canCancel()) {
            $this->update([
                'status' => 'cancelled',
                'notes' => $this->notes . "\nCancelled: " . ($reason ?? 'No reason provided')
            ]);
            return true;
        }
        return false;
    }

    public function complete($notes = null)
    {
        $this->update([
            'status' => 'completed',
            'notes' => $this->notes . ($notes ? "\nCompleted: " . $notes : '')
        ]);

        // NOTE: Financial record is NOT auto-created anymore.
        // User will be redirected to financial form to manually create/fill transaction details.
        // This allows for more control over transaction creation and custom amounts.
    }

    /**
     * Create a financial record for this appointment if one doesn't exist
     */
    public function createFinancialRecordIfNotExists()
    {
        // Check if a financial record already exists for this appointment
        $existingRecord = $this->financialRecords()->first();

        if ($existingRecord) {
            return $existingRecord; // Return existing record
        }

        // Ensure service is loaded
        if (!$this->relationLoaded('service')) {
            $this->load('service');
        }

        // Get total amount based on tooth records or fallback to service price
        $amount = $this->calculateTotalServiceAmountFromToothRecords();

        // Only create if amount is greater than 0
        if ($amount <= 0) {
            Log::warning('Cannot create financial record: Service price is 0 or null', [
                'appointment_id' => $this->id,
                'service_id' => $this->service_id
            ]);
            return null;
        }

        // Create the financial record with improved error handling
        try {
            // Use database transaction to ensure consistency
            $financialRecord = \Illuminate\Support\Facades\DB::transaction(function () use ($amount) {
                $financialRecord = FinancialRecord::create([
                    'patient_id' => $this->patient_id,
                    'appointment_id' => $this->id,
                    'amount' => 0, // No payment made yet
                    'balance' => $amount, // Full amount is balance
                    'is_partial_payment' => false, // Not yet a partial payment
                    'parent_record_id' => null,
                    'total_service_amount' => $amount,
                    'payment_method' => null,
                    'transaction_date' => $this->appointment_date,
                    'description' => ($this->service->name ?? 'Service') . ' - Appointment on ' . $this->appointment_date->format('M d, Y'),
                    'notes' => 'Auto-generated when appointment was completed. Staff: ' . ($this->doctor->name ?? 'Unknown'),
                ]);

                // Log the creation (if auth user exists, otherwise use system)
                if (Auth::check()) {
                    try {
                        AuditLog::logCreate(
                            Auth::id(),
                            Auth::user()->role,
                            'financial_records',
                            $financialRecord->id,
                            [
                                'auto_created' => true,
                                'appointment_id' => $this->id,
                                'amount' => $amount,
                            ]
                        );
                    } catch (\Exception $e) {
                        Log::warning('Failed to create audit log for financial record: ' . $e->getMessage(), [
                            'financial_record_id' => $financialRecord->id,
                            'appointment_id' => $this->id,
                            'error' => $e->getMessage()
                        ]);
                        // Don't fail transaction if audit log fails
                    }
                }

                return $financialRecord;
            });

            // Notify patient about the auto-created transaction (outside transaction, non-critical)
            try {
                $patient = $this->patient;
                if ($patient) {
                    $serviceName = $this->service->name ?? 'Service';
                    \App\Models\Notification::createTransactionNotification(
                        $patient->id,
                        'New Transaction Created',
                        "A transaction of ₱" . number_format($amount, 2) . " has been created for your completed appointment: {$serviceName}. Status: Pending"
                    );
                }
            } catch (\Exception $e) {
                Log::warning('Failed to send transaction notification for appointment: ' . $e->getMessage(), [
                    'appointment_id' => $this->id,
                    'patient_id' => $this->patient_id,
                    'error' => $e->getMessage()
                ]);
                // Don't fail if notification fails
            }

            return $financialRecord;
        } catch (\Exception $e) {
            Log::error('Failed to create financial record for appointment: ' . $e->getMessage(), [
                'appointment_id' => $this->id,
                'patient_id' => $this->patient_id,
                'service_id' => $this->service_id,
                'amount' => $amount,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Get the financial record for this appointment
     */
    public function getFinancialRecord()
    {
        return $this->financialRecords()->latest('created_at')->first();
    }

    /**
     * Check if this appointment has a financial record
     */
    public function hasFinancialRecord()
    {
        return $this->financialRecords()->exists();
    }

    /**
     * Check if payment has been confirmed/paid
     */
    public function isPaymentConfirmed()
    {
        $financialRecord = $this->getFinancialRecord();
        return $financialRecord && (float) $financialRecord->balance <= 0;
    }

    public function getPatientAge()
    {
        return $this->patient->patient->age ?? null;
    }

    /**
     * Normalize status for API responses (maps old 'in_progress' to 'not_available')
     * Also serialize appointment_date as Y-m-d string to avoid timezone conversion issues.
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Normalize status during transition period
        if (isset($array['status']) && $array['status'] === 'in_progress') {
            $array['status'] = 'not_available';
        }

        // Convert appointment_date to simple date string to avoid timezone conversion
        if (isset($array['appointment_date']) && $this->appointment_date instanceof \DateTimeInterface) {
            $array['appointment_date'] = $this->appointment_date->format('Y-m-d');
        }

        return $array;
    }
}
