<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'message',
        'type',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    public function scopeRead($query)
    {
        return $query->where('is_read', true);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeAppointment($query)
    {
        return $query->where('type', 'appointment');
    }

    public function scopeReminder($query)
    {
        return $query->where('type', 'reminder');
    }

    public function scopeTreatment($query)
    {
        return $query->where('type', 'treatment');
    }

    public function scopeSystem($query)
    {
        return $query->where('type', 'system');
    }

    public function scopeTransaction($query)
    {
        return $query->where('type', 'transaction');
    }

    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    // Accessors
    public function getFormattedDateAttribute()
    {
        return $this->created_at->format('M d, Y g:i A');
    }

    public function getTimeAgoAttribute()
    {
        return $this->created_at->diffForHumans();
    }

    public function getTypeColorAttribute()
    {
        return match($this->type) {
            'appointment' => 'blue',
            'reminder' => 'yellow',
            'treatment' => 'green',
            'transaction' => 'purple',
            'system' => 'gray',
            default => 'gray'
        };
    }

    public function getTypeIconAttribute()
    {
        return match($this->type) {
            'appointment' => 'calendar',
            'reminder' => 'clock',
            'treatment' => 'heart',
            'transaction' => 'philippine-peso',
            'system' => 'cog',
            default => 'bell'
        };
    }

    public function getUserNameAttribute()
    {
        return $this->user->name ?? 'Unknown';
    }

    // Helper methods
    public function markAsRead()
    {
        if (!$this->is_read) {
            $this->update([
                'is_read' => true,
                'read_at' => now()
            ]);
        }
    }

    public function markAsUnread()
    {
        if ($this->is_read) {
            $this->update([
                'is_read' => false,
                'read_at' => null
            ]);
        }
    }

    public function isAppointmentNotification()
    {
        return $this->type === 'appointment';
    }

    public function isReminderNotification()
    {
        return $this->type === 'reminder';
    }

    public function isTreatmentNotification()
    {
        return $this->type === 'treatment';
    }

    public function isSystemNotification()
    {
        return $this->type === 'system';
    }

    public function isTransactionNotification()
    {
        return $this->type === 'transaction';
    }

    public function isRecent($hours = 24)
    {
        return $this->created_at->greaterThan(now()->subHours($hours));
    }

    // Static methods for creating different types of notifications
    public static function createAppointmentNotification($userId, $title, $message)
    {
        return self::create([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => 'appointment'
        ]);
    }

    public static function createReminderNotification($userId, $title, $message)
    {
        return self::create([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => 'reminder'
        ]);
    }

    public static function createTreatmentNotification($userId, $title, $message)
    {
        return self::create([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => 'treatment'
        ]);
    }

    public static function createSystemNotification($userId, $title, $message)
    {
        return self::create([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => 'system'
        ]);
    }

    public static function createTransactionNotification($userId, $title, $message)
    {
        return self::create([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => 'transaction'
        ]);
    }

    // Batch operations
    public static function markAllAsReadForUser($userId)
    {
        return self::where('user_id', $userId)
                   ->where('is_read', false)
                   ->update([
                       'is_read' => true,
                       'read_at' => now()
                   ]);
    }

    public static function deleteOldNotifications($days = 30)
    {
        return self::where('created_at', '<', now()->subDays($days))->delete();
    }

    public static function getUnreadCountForUser($userId)
    {
        return self::where('user_id', $userId)->unread()->count();
    }

    public static function getRecentNotificationsForUser($userId, $limit = 10)
    {
        return self::where('user_id', $userId)
                   ->orderBy('created_at', 'desc')
                   ->limit($limit)
                   ->get();
    }

    // Notification summary
    public function getSummary()
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'message' => $this->message,
            'type' => $this->type,
            'type_color' => $this->type_color,
            'type_icon' => $this->type_icon,
            'is_read' => $this->is_read,
            'time_ago' => $this->time_ago,
            'formatted_date' => $this->formatted_date
        ];
    }
}
