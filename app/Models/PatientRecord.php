<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PatientRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'appointment_id',
        'treatment_notes',
        'diagnosis',
        'procedures_performed',
        'recommendations',
        'follow_up_instructions',
        'created_by',
    ];

    protected $casts = [
        'procedures_performed' => 'array',
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

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function toothRecords()
    {
        return $this->hasMany(ToothRecord::class, 'patient_record_id');
    }

    // Scopes
    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByDoctor($query, $doctorId)
    {
        return $query->where('created_by', $doctorId);
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    public function scopeWithDiagnosis($query)
    {
        return $query->whereNotNull('diagnosis');
    }

    public function scopeWithRecommendations($query)
    {
        return $query->whereNotNull('recommendations');
    }

    // Accessors
    public function getFormattedDateAttribute()
    {
        return $this->created_at->format('M d, Y');
    }

    public function getDoctorNameAttribute()
    {
        return $this->createdBy->name ?? 'Unknown';
    }

    public function getPatientNameAttribute()
    {
        return $this->patient->name ?? 'Unknown';
    }

    public function getProceduresCountAttribute()
    {
        return is_array($this->procedures_performed) ? count($this->procedures_performed) : 0;
    }

    // Helper methods
    public function hasDiagnosis()
    {
        return !empty($this->diagnosis);
    }

    public function hasRecommendations()
    {
        return !empty($this->recommendations);
    }

    public function hasFollowUpInstructions()
    {
        return !empty($this->follow_up_instructions);
    }

    public function hasProcedures()
    {
        return !empty($this->procedures_performed) && is_array($this->procedures_performed);
    }

    public function addProcedure($procedure)
    {
        $procedures = $this->procedures_performed ?? [];
        $procedures[] = $procedure;
        $this->procedures_performed = $procedures;
        $this->save();
    }

    public function removeProcedure($procedureIndex)
    {
        $procedures = $this->procedures_performed ?? [];
        if (isset($procedures[$procedureIndex])) {
            unset($procedures[$procedureIndex]);
            $this->procedures_performed = array_values($procedures);
            $this->save();
        }
    }

    public function getProceduresList()
    {
        return $this->procedures_performed ?? [];
    }

    public function getRecordSummary()
    {
        $summary = [
            'date' => $this->formatted_date,
            'doctor' => $this->doctor_name,
            'patient' => $this->patient_name,
        ];

        if ($this->hasDiagnosis()) {
            $summary['diagnosis'] = $this->diagnosis;
        }

        if ($this->hasProcedures()) {
            $summary['procedures_count'] = $this->procedures_count;
        }

        if ($this->hasRecommendations()) {
            $summary['has_recommendations'] = true;
        }

        return $summary;
    }
}
