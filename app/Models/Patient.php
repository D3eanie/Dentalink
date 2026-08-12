<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Patient extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'birthday',
        'gender',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relationship',
        'insurance_provider',
        'insurance_number',
        'medical_history',
        'allergies',
        'current_medications',
        'blood_type',
        'last_appointment_date',
    ];

    protected $casts = [
        'birthday' => 'date',
        'last_appointment_date' => 'datetime',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'patient_id', 'user_id');
    }

    public function patientRecords()
    {
        return $this->hasMany(PatientRecord::class, 'patient_id', 'user_id');
    }

    public function treatmentPlans()
    {
        return $this->hasMany(TreatmentPlan::class, 'patient_id', 'user_id');
    }

    public function financialRecords()
    {
        return $this->hasMany(FinancialRecord::class, 'patient_id', 'user_id');
    }

    // Accessors
    public function getAgeAttribute()
    {
        return $this->birthday ? Carbon::parse($this->birthday)->age : null;
    }

    public function getFullNameAttribute()
    {
        return $this->user->name;
    }

    // Scopes
    public function scopeByGender($query, $gender)
    {
        return $query->where('gender', $gender);
    }

    public function scopeByBloodType($query, $bloodType)
    {
        return $query->where('blood_type', $bloodType);
    }

    public function scopeWithInsurance($query)
    {
        return $query->whereNotNull('insurance_provider');
    }

    // Helper methods
    public function hasAllergies()
    {
        return !empty($this->allergies) && strtolower($this->allergies) !== 'none known';
    }

    public function hasMedications()
    {
        return !empty($this->current_medications) && strtolower($this->current_medications) !== 'none';
    }

    public function getMedicalSummary()
    {
        $summary = [];

        if ($this->hasAllergies()) {
            $summary['allergies'] = $this->allergies;
        }

        if ($this->hasMedications()) {
            $summary['medications'] = $this->current_medications;
        }

        if (!empty($this->medical_history)) {
            $summary['history'] = $this->medical_history;
        }

        return $summary;
    }

    /**
     * Check if patient is inactive (no appointments in 30 days)
     */
    public function isInactive(int $days = 30): bool
    {
        if (!$this->last_appointment_date) {
            return false; // No appointments yet
        }

        return $this->last_appointment_date->diffInDays(now()) >= $days;
    }

    /**
     * Get days since last appointment
     */
    public function daysSinceLastAppointment(): ?int
    {
        if (!$this->last_appointment_date) {
            return null;
        }

        return $this->last_appointment_date->diffInDays(now());
    }

    /**
     * Update last appointment date to now
     */
    public function updateLastAppointment(): void
    {
        $this->update(['last_appointment_date' => now()]);
    }

    /**
     * Serialize the model to an array for API responses
     * Ensures birthday is formatted as YYYY-MM-DD to avoid timezone conversion
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Convert birthday to simple date string to avoid timezone conversion
        if (isset($array['birthday']) && $this->birthday instanceof \DateTimeInterface) {
            $array['birthday'] = $this->birthday->format('Y-m-d');
        }

        return $array;
    }
}
