<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'price',
        'duration_minutes',
        'category',
        'is_active',
        'requires_multiple_teeth',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_active' => 'boolean',
        'requires_multiple_teeth' => 'boolean',
    ];

    // Relationships
    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    public function scopePreventive($query)
    {
        return $query->where('category', 'preventive');
    }

    public function scopeRestorative($query)
    {
        return $query->where('category', 'restorative');
    }

    public function scopeCosmetic($query)
    {
        return $query->where('category', 'cosmetic');
    }

    public function scopeSurgical($query)
    {
        return $query->where('category', 'surgical');
    }

    public function scopeEmergency($query)
    {
        return $query->where('category', 'emergency');
    }

    // Accessors
    public function getFormattedPriceAttribute()
    {
        return '$' . number_format($this->price, 2);
    }

    public function getDurationHoursAttribute()
    {
        return round($this->duration_minutes / 60, 2);
    }

    public function getCategoryDisplayAttribute()
    {
        return ucfirst($this->category);
    }

    // Helper methods
    public function isExpensive($threshold = 500)
    {
        return $this->price > $threshold;
    }

    public function isLongProcedure($threshold = 120)
    {
        return $this->duration_minutes > $threshold;
    }

    public function getEstimatedEndTime($startTime)
    {
        return $startTime->addMinutes($this->duration_minutes);
    }
}
