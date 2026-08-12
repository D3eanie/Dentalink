<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'address',
        'status',
        'last_login_at',
        // Staff-specific fields
        'employee_id',
        'position',
        'license_number',
        'license_expiry',
        'hire_date',
        'hourly_rate',
        'specializations',
        'bio',
        'years_experience',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'password' => 'hashed',
        'license_expiry' => 'date',
        'hire_date' => 'date',
        'hourly_rate' => 'decimal:2',
        'specializations' => 'array',
    ];

    // Relationships

    // Patient relationship (if user is a patient)
    public function patient()
    {
        return $this->hasOne(Patient::class)->withDefault([
            'birthday' => null,
            'gender' => null,
            'emergency_contact_name' => 'Not Set',
            'emergency_contact_phone' => 'Not Set',
            'medical_history' => 'No history recorded',
            'allergies' => 'None known',
            'current_medications' => 'None',
        ]);
    }

    // Appointments as patient
    public function patientAppointments()
    {
        return $this->hasMany(Appointment::class, 'patient_id');
    }

    // Appointments as doctor/staff
    public function doctorAppointments()
    {
        return $this->hasMany(Appointment::class, 'doctor_id');
    }

    // Patient records created by this user (if staff)
    public function createdPatientRecords()
    {
        return $this->hasMany(PatientRecord::class, 'created_by');
    }

    // Patient records for this user (if patient)
    public function patientRecords()
    {
        return $this->hasMany(PatientRecord::class, 'patient_id');
    }

    // Treatment plans as patient
    public function patientTreatmentPlans()
    {
        return $this->hasMany(TreatmentPlan::class, 'patient_id');
    }

    // Treatment plans created as doctor
    public function doctorTreatmentPlans()
    {
        return $this->hasMany(TreatmentPlan::class, 'doctor_id');
    }

    // Staff schedules (if staff)
    public function schedules()
    {
        return $this->hasMany(Schedule::class, 'staff_id');
    }

    // Notifications
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    // Financial records (if patient)
    public function financialRecords()
    {
        return $this->hasMany(FinancialRecord::class, 'patient_id');
    }

    // Audit logs performed by this user
    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class, 'performed_by');
    }

    // Scopes
    public function scopeByRole($query, $role)
    {
        return $query->where('role', $role);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopePatients($query)
    {
        return $query->where('role', 'patient');
    }

    public function scopeStaff($query)
    {
        return $query->where('role', 'staff');
    }

    public function scopeAdmins($query)
    {
        return $query->where('role', 'admin');
    }

    // Role checking methods
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isStaff(): bool
    {
        return $this->role === 'staff';
    }

    public function isPatient(): bool
    {
        return $this->role === 'patient';
    }

    public function isDentist(): bool
    {
        return $this->isStaff() && $this->position === 'dentist';
    }

    public function isHygienist(): bool
    {
        return $this->isStaff() && $this->position === 'hygienist';
    }

    public function isReceptionist(): bool
    {
        return $this->isStaff() && $this->position === 'receptionist';
    }

    public function isAssistant(): bool
    {
        return $this->isStaff() && $this->position === 'assistant';
    }

    public function isDoctor(): bool
    {
        return $this->isDentist();
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles);
    }

    public function canManageAppointments(): bool
    {
        return $this->isAdmin() || $this->isStaff();
    }

    public function canManagePatientRecords(): bool
    {
        return $this->isAdmin() || $this->isStaff();
    }

    public function canManageUsers(): bool
    {
        return $this->isAdmin();
    }

    // Helper methods
    public function getFullNameAttribute()
    {
        return $this->name;
    }

    public function hasUpcomingAppointments()
    {
        if ($this->isPatient()) {
            return $this->patientAppointments()
                ->where('appointment_date', '>=', now())
                ->where('status', '!=', 'cancelled')
                ->exists();
        }

        if ($this->isStaff()) {
            return $this->doctorAppointments()
                ->where('appointment_date', '>=', now())
                ->where('status', '!=', 'cancelled')
                ->exists();
        }

        return false;
    }

    public function ensurePatientRecord()
    {
        if ($this->isPatient() && !$this->patient()->exists()) {
            return Patient::create([
                'user_id' => $this->id,
                'birthday' => null,
                'gender' => null,
                'emergency_contact_name' => 'To be updated',
                'emergency_contact_phone' => 'To be updated',
                'medical_history' => 'No history recorded',
                'allergies' => 'None known',
                'current_medications' => 'None',
            ]);
        }
        return $this->patient;
    }

    /**
     * Send the email verification notification.
     *
     * @return void
     */
    public function sendEmailVerificationNotification()
    {
        $this->notify(new \App\Notifications\VerifyEmail);
    }

    /**
     * Send the password reset notification.
     *
     * @param  string  $token
     * @return void
     */
    public function sendPasswordResetNotification($token)
    {
        $this->notify(new \App\Notifications\ResetPassword($token));
    }

    /**
     * Serialize the model to an array for API responses
     * Ensures date fields are formatted as YYYY-MM-DD to avoid timezone conversion
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Convert date fields to simple date strings to avoid timezone conversion
        if (isset($array['license_expiry']) && $this->license_expiry instanceof \DateTimeInterface) {
            $array['license_expiry'] = $this->license_expiry->format('Y-m-d');
        }

        if (isset($array['hire_date']) && $this->hire_date instanceof \DateTimeInterface) {
            $array['hire_date'] = $this->hire_date->format('Y-m-d');
        }

        return $array;
    }
}
