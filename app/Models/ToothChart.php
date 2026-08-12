<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ToothChart extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'tooth_statuses',
        'chart_type',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'tooth_statuses' => 'array',
    ];

    // Relationships
    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Scopes
    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('chart_type', $type);
    }

    /**
     * Generate tooth chart from current tooth records
     */
    public static function generateFromToothRecords($patientId, $chartType = 'examination', $notes = null, $createdBy = null)
    {
        // Get all tooth records for the patient
        $toothRecords = ToothRecord::byPatient($patientId)->get();

        // Build chart with all 32 teeth
        $chart = [];
        $positions = ToothRecord::getToothPositions();

        foreach ($positions as $toothNumber => $info) {
            $record = $toothRecords->where('tooth_number', $toothNumber)->first();
            $chart[$toothNumber] = $record ? $record->tooth_status : 'healthy';
        }

        return self::create([
            'patient_id' => $patientId,
            'tooth_statuses' => $chart,
            'chart_type' => $chartType,
            'notes' => $notes,
            'created_by' => $createdBy,
        ]);
    }

    /**
     * Get status distribution
     */
    public function getStatusSummary(): array
    {
        $summary = [
            'healthy' => 0,
            'treatment_needed' => 0,
            'treated' => 0,
            'extracted' => 0,
            'missing' => 0,
            'implant' => 0,
        ];

        foreach ($this->tooth_statuses as $status) {
            if (isset($summary[$status])) {
                $summary[$status]++;
            }
        }

        return $summary;
    }

    /**
     * Get teeth needing treatment
     */
    public function getTeethNeedingTreatment(): array
    {
        return array_keys(array_filter($this->tooth_statuses, function ($status) {
            return $status === 'treatment_needed';
        }));
    }
}
