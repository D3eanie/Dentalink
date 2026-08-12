<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TreatmentPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'plan_title',
        'diagnosis',
        'planned_procedures',
        'estimated_cost',
        'start_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'planned_procedures' => 'array',
        'estimated_cost' => 'decimal:2',
        'start_date' => 'date',
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

    // Scopes
    public function scopeActive($query)
    {
        return $query->whereIn('status', ['approved', 'in_progress']);
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByDoctor($query, $doctorId)
    {
        return $query->where('doctor_id', $doctorId);
    }

    public function scopeExpensive($query, $amount = 1000)
    {
        return $query->where('estimated_cost', '>', $amount);
    }

    public function scopeStartingSoon($query, $days = 7)
    {
        return $query->where('start_date', '<=', now()->addDays($days))
                    ->where('start_date', '>=', now());
    }

    // Accessors
    public function getFormattedCostAttribute()
    {
        return '$' . number_format($this->estimated_cost, 2);
    }

    public function getFormattedStartDateAttribute()
    {
        return $this->start_date ? $this->start_date->format('M d, Y') : 'Not set';
    }

    public function getStatusColorAttribute()
    {
        return match($this->status) {
            'draft' => 'gray',
            'approved' => 'blue',
            'in_progress' => 'yellow',
            'completed' => 'green',
            default => 'gray'
        };
    }

    public function getPatientNameAttribute()
    {
        return $this->patient->name ?? 'Unknown';
    }

    public function getDoctorNameAttribute()
    {
        return $this->doctor->name ?? 'Unknown';
    }

    public function getProceduresCountAttribute()
    {
        return is_array($this->planned_procedures) ? count($this->planned_procedures) : 0;
    }

    public function getProgressPercentageAttribute()
    {
        // This would need to be calculated based on completed procedures
        // For now, return a basic calculation based on status
        return match($this->status) {
            'draft' => 0,
            'approved' => 25,
            'in_progress' => 50,
            'completed' => 100,
            default => 0
        };
    }

    // Helper methods
    public function isDraft()
    {
        return $this->status === 'draft';
    }

    public function isApproved()
    {
        return $this->status === 'approved';
    }

    public function isInProgress()
    {
        return $this->status === 'in_progress';
    }

    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    public function canBeEdited()
    {
        return in_array($this->status, ['draft', 'approved']);
    }

    public function canBeApproved()
    {
        return $this->status === 'draft';
    }

    public function canBeStarted()
    {
        return $this->status === 'approved' &&
               $this->start_date &&
               $this->start_date->isToday();
    }

    public function approve()
    {
        if ($this->canBeApproved()) {
            $this->update(['status' => 'approved']);
            return true;
        }
        return false;
    }

    public function start()
    {
        if ($this->canBeStarted() || $this->status === 'approved') {
            $this->update([
                'status' => 'in_progress',
                'start_date' => $this->start_date ?? now()
            ]);
            return true;
        }
        return false;
    }

    public function complete()
    {
        if ($this->status === 'in_progress') {
            $this->update(['status' => 'completed']);
            return true;
        }
        return false;
    }

    public function addProcedure($procedure)
    {
        $procedures = $this->planned_procedures ?? [];
        $procedures[] = $procedure;
        $this->planned_procedures = $procedures;
        $this->save();
    }

    public function removeProcedure($procedureIndex)
    {
        $procedures = $this->planned_procedures ?? [];
        if (isset($procedures[$procedureIndex])) {
            unset($procedures[$procedureIndex]);
            $this->planned_procedures = array_values($procedures);
            $this->save();
        }
    }

    public function getProceduresList()
    {
        return $this->planned_procedures ?? [];
    }

    public function isExpensive($threshold = 2000)
    {
        return $this->estimated_cost > $threshold;
    }

    public function isLongTerm($threshold = 3)
    {
        return $this->procedures_count > $threshold;
    }

    public function getTreatmentSummary()
    {
        return [
            'title' => $this->plan_title,
            'patient' => $this->patient_name,
            'doctor' => $this->doctor_name,
            'status' => $this->status,
            'cost' => $this->formatted_cost,
            'procedures_count' => $this->procedures_count,
            'start_date' => $this->formatted_start_date,
            'progress' => $this->progress_percentage . '%'
        ];
    }

    /**
     * Serialize the model to an array for API responses
     * Ensures start_date is formatted as YYYY-MM-DD to avoid timezone conversion
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Convert start_date to simple date string to avoid timezone conversion
        if (isset($array['start_date']) && $this->start_date instanceof \DateTimeInterface) {
            $array['start_date'] = $this->start_date->format('Y-m-d');
        }

        return $array;
    }
}
