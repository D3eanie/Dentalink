<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class ToothRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'patient_record_id',
        'appointment_id',
        'service_id',
        'tooth_number',
        'tooth_position',
        'surface',
        'service',
        'treatment_type',
        'treatment_description',
        'material_type',
        'materials_used',
        'tooth_status',
        'tooth_condition',
        'notes',
        'clinical_notes',
        'date_done',
        'treatment_date',
        'next_review_date',
    ];

    protected $casts = [
        'date_done' => 'date',
        'treatment_date' => 'datetime',
        'next_review_date' => 'datetime',
        'materials_used' => 'array',
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

    public function dentist()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function patientRecord()
    {
        return $this->belongsTo(PatientRecord::class, 'patient_record_id');
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class, 'appointment_id');
    }

    public function serviceRecord()
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    // Scopes
    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByTooth($query, $toothNumber)
    {
        return $query->where('tooth_number', $toothNumber);
    }

    public function scopeByTreatment($query, $treatmentType)
    {
        return $query->where('treatment_type', $treatmentType);
    }

    public function scopeNeedingReview($query)
    {
        return $query->where('next_review_date', '<=', now())
            ->where('tooth_status', '!=', 'extracted')
            ->orderBy('next_review_date');
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('tooth_status', $status);
    }

    // Tooth FDI Numbering System (International Standard)
    public static function getToothPositions()
    {
        return [
            // Upper Right Quadrant (11-18)
            11 => ['position' => 'Upper Right', 'tooth' => 'Central Incisor', 'quadrant' => 1],
            12 => ['position' => 'Upper Right', 'tooth' => 'Lateral Incisor', 'quadrant' => 1],
            13 => ['position' => 'Upper Right', 'tooth' => 'Canine', 'quadrant' => 1],
            14 => ['position' => 'Upper Right', 'tooth' => 'First Premolar', 'quadrant' => 1],
            15 => ['position' => 'Upper Right', 'tooth' => 'Second Premolar', 'quadrant' => 1],
            16 => ['position' => 'Upper Right', 'tooth' => 'First Molar', 'quadrant' => 1],
            17 => ['position' => 'Upper Right', 'tooth' => 'Second Molar', 'quadrant' => 1],
            18 => ['position' => 'Upper Right', 'tooth' => 'Third Molar', 'quadrant' => 1],

            // Upper Left Quadrant (21-28)
            21 => ['position' => 'Upper Left', 'tooth' => 'Central Incisor', 'quadrant' => 2],
            22 => ['position' => 'Upper Left', 'tooth' => 'Lateral Incisor', 'quadrant' => 2],
            23 => ['position' => 'Upper Left', 'tooth' => 'Canine', 'quadrant' => 2],
            24 => ['position' => 'Upper Left', 'tooth' => 'First Premolar', 'quadrant' => 2],
            25 => ['position' => 'Upper Left', 'tooth' => 'Second Premolar', 'quadrant' => 2],
            26 => ['position' => 'Upper Left', 'tooth' => 'First Molar', 'quadrant' => 2],
            27 => ['position' => 'Upper Left', 'tooth' => 'Second Molar', 'quadrant' => 2],
            28 => ['position' => 'Upper Left', 'tooth' => 'Third Molar', 'quadrant' => 2],

            // Lower Left Quadrant (31-38)
            31 => ['position' => 'Lower Left', 'tooth' => 'Central Incisor', 'quadrant' => 3],
            32 => ['position' => 'Lower Left', 'tooth' => 'Lateral Incisor', 'quadrant' => 3],
            33 => ['position' => 'Lower Left', 'tooth' => 'Canine', 'quadrant' => 3],
            34 => ['position' => 'Lower Left', 'tooth' => 'First Premolar', 'quadrant' => 3],
            35 => ['position' => 'Lower Left', 'tooth' => 'Second Premolar', 'quadrant' => 3],
            36 => ['position' => 'Lower Left', 'tooth' => 'First Molar', 'quadrant' => 3],
            37 => ['position' => 'Lower Left', 'tooth' => 'Second Molar', 'quadrant' => 3],
            38 => ['position' => 'Lower Left', 'tooth' => 'Third Molar', 'quadrant' => 3],

            // Lower Right Quadrant (41-48)
            41 => ['position' => 'Lower Right', 'tooth' => 'Central Incisor', 'quadrant' => 4],
            42 => ['position' => 'Lower Right', 'tooth' => 'Lateral Incisor', 'quadrant' => 4],
            43 => ['position' => 'Lower Right', 'tooth' => 'Canine', 'quadrant' => 4],
            44 => ['position' => 'Lower Right', 'tooth' => 'First Premolar', 'quadrant' => 4],
            45 => ['position' => 'Lower Right', 'tooth' => 'Second Premolar', 'quadrant' => 4],
            46 => ['position' => 'Lower Right', 'tooth' => 'First Molar', 'quadrant' => 4],
            47 => ['position' => 'Lower Right', 'tooth' => 'Second Molar', 'quadrant' => 4],
            48 => ['position' => 'Lower Right', 'tooth' => 'Third Molar', 'quadrant' => 4],
        ];
    }

    /**
     * Get friendly tooth name
     */
    public function getToothName(): string
    {
        $positions = self::getToothPositions();
        if (isset($positions[$this->tooth_number])) {
            $info = $positions[$this->tooth_number];
            return "Tooth #{$this->tooth_number} - {$info['position']} {$info['tooth']}";
        }
        return "Tooth #{$this->tooth_number}";
    }

    /**
     * Get tooth quadrant
     */
    public function getQuadrant(): int
    {
        $positions = self::getToothPositions();
        return $positions[$this->tooth_number]['quadrant'] ?? 0;
    }

    /**
     * Check if tooth needs review
     */
    public function needsReview(): bool
    {
        return $this->next_review_date && $this->next_review_date->isPast();
    }

    /**
     * Get days until review needed
     */
    public function daysUntilReview(): ?int
    {
        if (!$this->next_review_date) {
            return null;
        }

        if ($this->needsReview()) {
            return -$this->next_review_date->diffInDays(now());
        }

        return $this->next_review_date->diffInDays(now());
    }

    /**
     * Mark as reviewed
     */
    public function markReviewed(?int $reviewInDays = 180): void
    {
        $this->update([
            'next_review_date' => now()->addDays($reviewInDays),
        ]);
    }

    /**
     * Get treatment history for this tooth
     */
    public function getHistory()
    {
        return self::byPatient($this->patient_id)
            ->byTooth($this->tooth_number)
            ->orderBy('treatment_date', 'desc')
            ->get();
    }
}
