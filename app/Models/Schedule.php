<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'staff_id',
        'date',
        'start_time',
        'end_time',
        'is_available',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'is_available' => 'boolean',
    ];

    // Relationships
    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'doctor_id', 'staff_id')
                    ->whereDate('appointment_date', $this->date);
    }

    // Scopes
    public function scopeAvailable($query)
    {
        return $query->where('is_available', true);
    }

    public function scopeUnavailable($query)
    {
        return $query->where('is_available', false);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('date', today());
    }

    public function scopeTomorrow($query)
    {
        return $query->whereDate('date', now()->addDay());
    }


    public function scopeThisWeek($query)
    {
        return $query->whereBetween('date', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
    }

    public function scopeUpcoming($query)
    {
        return $query->where('date', '>=', today());
    }

    public function scopeByStaff($query, $staffId)
    {
        return $query->where('staff_id', $staffId);
    }

    public function scopeByDate($query, $date)
    {
        return $query->whereDate('date', $date);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * Scope to get past schedules (before today)
     */
    public function scopePast($query)
    {
        return $query->where('date', '<', today());
    }

    /**
     * Clean up past schedules that have no appointments
     * This should be called via a scheduled command
     */
    public static function cleanupPastSchedules()
    {
        $deleted = self::past()
            ->whereDoesntHave('appointments', function ($query) {
                $query->whereNotIn('status', ['cancelled', 'no_show']);
            })
            ->delete();

        return $deleted;
    }

    // Accessors
    public function getFormattedDateAttribute()
    {
        return $this->date->format('M d, Y');
    }

    public function getFormattedStartTimeAttribute()
    {
        return $this->start_time->format('g:i A');
    }

    public function getFormattedEndTimeAttribute()
    {
        return $this->end_time->format('g:i A');
    }

    public function getTimeRangeAttribute()
    {
        return $this->formatted_start_time . ' - ' . $this->formatted_end_time;
    }

    public function getDurationHoursAttribute()
    {
        return $this->start_time->diffInHours($this->end_time);
    }

    public function getDurationMinutesAttribute()
    {
        return $this->start_time->diffInMinutes($this->end_time);
    }

    public function getStaffNameAttribute()
    {
        return $this->staff->name ?? 'Unknown';
    }

    public function getStatusColorAttribute()
    {
        if (!$this->is_available) {
            return 'red';
        }

        if ($this->date->isToday()) {
            return 'green';
        }

        if ($this->date->isFuture()) {
            return 'blue';
        }

        return 'gray';
    }

    // Helper methods
    public function isToday()
    {
        return $this->date->isToday();
    }

    public function isTomorrow()
    {
        return $this->date->isTomorrow();
    }

    public function isPast()
    {
        return $this->date->isPast();
    }

    public function isFuture()
    {
        return $this->date->isFuture();
    }

    public function isWeekend()
    {
        return $this->date->isWeekend();
    }

    /**
     * Check if a time slot conflicts with this schedule
     * Includes buffer time after appointments
     *
     * @param string|Carbon $startTime Start time of the slot to check
     * @param string|Carbon $endTime End time of the slot to check
     * @param int|null $bufferMinutes Buffer time in minutes (uses config if not provided)
     * @return bool True if there's a conflict
     */
    public function hasConflict($startTime, $endTime, $bufferMinutes = null)
    {
        $bufferMinutes = $bufferMinutes ?? config('app.appointment.buffer_minutes', 15);
        $scheduleStart = Carbon::parse($this->date->format('Y-m-d') . ' ' . $this->start_time->format('H:i:s'));
        $scheduleEnd = Carbon::parse($this->date->format('Y-m-d') . ' ' . $this->end_time->format('H:i:s'));

        $newStart = Carbon::parse($startTime);
        $newEnd = Carbon::parse($endTime);

        // Add buffer time to the end time being checked
        $newEndWithBuffer = $newEnd->copy()->addMinutes($bufferMinutes);

        // Check if the slot (including buffer) conflicts with the schedule
        return $newStart->between($scheduleStart, $scheduleEnd) ||
               $newEndWithBuffer->between($scheduleStart, $scheduleEnd) ||
               ($newStart->lessThanOrEqualTo($scheduleStart) && $newEndWithBuffer->greaterThanOrEqualTo($scheduleEnd));
    }

    /**
     * Get available time slots for this schedule
     *
     * @param int $durationMinutes Duration of each appointment slot in minutes (default: 30)
     * @param int|null $bufferMinutes Buffer time after each appointment (uses config if not provided)
     * @return array Array of available time slots
     */
   public function getAvailableTimeSlots($durationMinutes = 30, $bufferMinutes = null, $slotIntervalMinutes = 15)
        {
            // CRITICAL: Ensure duration, buffer, and interval are integers
            $durationMinutes = (int) $durationMinutes;
            $bufferMinutes = $bufferMinutes ?? config('app.appointment.buffer_minutes', 15);
            $bufferMinutes = (int) $bufferMinutes;
            $slotIntervalMinutes = (int) $slotIntervalMinutes;

            $slots = [];

            // Use copy() since start_time and end_time are already Carbon instances
            $currentTime = $this->start_time->copy();
            $endTime = $this->end_time->copy();

            // Get existing appointments for this doctor on this date
            // Only count confirmed/paid appointments as blocking the slot (exclude unconfirmed 'scheduled' status)
            $existingAppointments = Appointment::where('doctor_id', $this->staff_id)
                ->whereDate('appointment_date', $this->date)
                ->whereNotIn('status', ['scheduled', 'cancelled', 'no_show'])
                ->orderBy('appointment_time')
                ->get();

            while ($currentTime < $endTime) {
                // LUNCH BREAK ENFORCEMENT: Reject appointments during 12:00-13:00 lunch
                // Allow all appointments starting at 13:00 or later (after lunch)
                $slotStartHour = (int) $currentTime->format('H');
                $slotEndTime = $currentTime->copy()->addMinutes($durationMinutes);
                $lunchStart = $currentTime->copy()->setHour(12)->setMinute(0)->setSecond(0);

                // Skip if:
                // 1. Slot starts during lunch hour (hour 12), OR
                // 2. Slot starts before lunch but ends at/after 12:00
                // Allow all slots starting at 13:00 or later (after lunch)
                if ($slotStartHour === 12 ||
                    ($slotStartHour < 12 && $slotEndTime->greaterThanOrEqualTo($lunchStart))) {
                    $currentTime->addMinutes($slotIntervalMinutes);
                    continue;
                }

                $slotTime = $currentTime->format('H:i:00');
                $slotEnd = $slotEndTime->format('H:i:00');

                // Check if new appointment + buffer conflicts with existing appointment + its buffer
                $isAvailable = true;
                foreach ($existingAppointments as $appointment) {
                    // appointment_time is a TIME field (H:i:s format)
                    $appointmentStart = Carbon::createFromFormat('H:i:s', $appointment->appointment_time);
                    // Service ends without buffer
                    $appointmentServiceEnd = $appointmentStart->copy()->addMinutes((int) $appointment->duration_minutes);

                    // Compare times only
                    $slotStart = Carbon::createFromFormat('H:i:s', $currentTime->format('H:i:s'));
                    $slotEndTime = $slotStart->copy()->addMinutes($durationMinutes);

                    // New appointment end time including required buffer
                    $slotEndWithBuffer = $slotEndTime->copy()->addMinutes($bufferMinutes);

                    // Reject if: new appointment ends (+ buffer) after existing appointment starts
                    // AND new appointment starts before existing appointment ends (+ its buffer)
                    $appointmentEndWithBuffer = $appointmentServiceEnd->copy()->addMinutes($bufferMinutes);
                    if ($slotStart->lessThan($appointmentEndWithBuffer) && $slotEndWithBuffer->greaterThan($appointmentStart)) {
                        $isAvailable = false;
                        break;
                    }
                }

                // CRITICAL FIX: Only add slot if appointment can be completed within schedule
                // This prevents slots that would extend beyond the schedule end time
                $slotEndTime = $currentTime->copy()->addMinutes($durationMinutes);
                if ($isAvailable && $slotEndTime <= $endTime) {
                    $slots[] = [
                        'time' => $slotTime,
                        'display' => $currentTime->format('g:i A'),
                        'available' => true
                    ];
                }

                $currentTime->addMinutes($slotIntervalMinutes); // Use 15-minute intervals for slot display
            }

            return $slots;
        }

    public function getBookedAppointmentsCount()
    {
        return $this->appointments()
                    ->whereNotIn('status', ['cancelled', 'no_show'])
                    ->count();
    }

    public function getUtilizationPercentage()
    {
        $totalMinutes = $this->duration_minutes;
        $bookedMinutes = $this->appointments()
                             ->whereNotIn('status', ['cancelled', 'no_show'])
                             ->sum('duration_minutes');

        return $totalMinutes > 0 ? round(($bookedMinutes / $totalMinutes) * 100, 1) : 0;
    }

    public function canBeModified()
    {
        return $this->date->isFuture() ||
               ($this->date->isToday() && now()->lessThan($this->start_time));
    }

    public function makeUnavailable($reason = null)
    {
        $this->update([
            'is_available' => false,
            'notes' => $this->notes . ($reason ? "\nUnavailable: " . $reason : '')
        ]);
    }

    public function makeAvailable()
    {
        $this->update(['is_available' => true]);
    }

    /**
     * Serialize the model to an array for API responses
     * Ensures date is formatted consistently as YYYY-MM-DD
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Ensure date is formatted as YYYY-MM-DD for consistent API responses
        if (isset($array['date']) && $this->date instanceof Carbon) {
            $array['date'] = $this->date->format('Y-m-d');
        }

        return $array;
    }
}
