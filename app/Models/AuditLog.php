<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $table = 'audit_logs';

    protected $fillable = [
        'action',
        'performed_by',
        'user_role',
        'target_collection',
        'target_id',
        'details',
        'timestamp',
        'current_hash',
        'previous_hash',
        'is_verified',
    ];

    protected $casts = [
        'details' => 'array',
        'timestamp' => 'datetime',
        'is_verified' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Boot the model - auto-generate hashes before creating
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            // Generate hash if not already set
            if (empty($model->current_hash)) {
                $model->current_hash = self::generateHashForRecord($model);
            }

            // Get previous hash for chain linking
            if (empty($model->previous_hash)) {
                $previousLog = self::orderBy('id', 'desc')->first();
                $model->previous_hash = $previousLog?->current_hash ?? '';
            }
        });
    }

    /**
     * Generate hash for a record
     */
    private static function generateHashForRecord($record): string
    {
        $hashData = [
            'action' => $record->action,
            'performed_by' => $record->performed_by,
            'user_role' => $record->user_role,
            'target_collection' => $record->target_collection,
            'target_id' => $record->target_id,
            'details' => $record->details,
            'timestamp' => $record->timestamp->toIso8601String(),
        ];

        // Use numeric value 4 for JSON_SORT_KEYS for consistency
        $dataString = json_encode($hashData, 4);
        $previousHash = $record->previous_hash ?? '';
        $chainString = $previousHash ? $previousHash . $dataString : $dataString;

        return hash('sha256', $chainString);
    }

    /**
     * Relationship: User who performed the action
     */
    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    /**
     * Scope: Get recent audit logs
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('timestamp', '>=', now()->subDays($days));
    }

    /**
     * Scope: Get only verified records
     */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    /**
     * Scope: Get unverified records (potential tampering)
     */
    public function scopeUnverified($query)
    {
        return $query->where('is_verified', false);
    }

    /**
     * Scope: Get by action type
     */
    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope: Get by target collection
     */
    public function scopeByCollection($query, string $collection)
    {
        return $query->where('target_collection', $collection);
    }

    /**
     * Scope: Get by target ID
     */
    public function scopeByTargetId($query, int $targetId)
    {
        return $query->where('target_id', $targetId);
    }

    /**
     * Scope: Get by user
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('performed_by', $userId);
    }

    /**
     * Scope: Get records between dates
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('timestamp', [$startDate, $endDate]);
    }

    /**
     * Static method: Log a create action
     */
    public static function logCreate(int $userId, string $userRole, string $collection, int $targetId, array $details = [])
    {
        return self::create([
            'action' => 'create',
            'performed_by' => $userId,
            'user_role' => $userRole,
            'target_collection' => $collection,
            'target_id' => $targetId,
            'details' => $details,
            'timestamp' => now(),
        ]);
    }

    /**
     * Static method: Log an update action
     */
    public static function logUpdate(int $userId, string $userRole, string $collection, int $targetId, array $details = [])
    {
        return self::create([
            'action' => 'update',
            'performed_by' => $userId,
            'user_role' => $userRole,
            'target_collection' => $collection,
            'target_id' => $targetId,
            'details' => $details,
            'timestamp' => now(),
        ]);
    }

    /**
     * Static method: Log a delete action
     */
    public static function logDelete(int $userId, string $userRole, string $collection, int $targetId, array $details = [])
    {
        return self::create([
            'action' => 'delete',
            'performed_by' => $userId,
            'user_role' => $userRole,
            'target_collection' => $collection,
            'target_id' => $targetId,
            'details' => $details,
            'timestamp' => now(),
        ]);
    }

    /**
     * Static method: Log a view action
     */
    public static function logView(int $userId, string $userRole, string $collection, int $targetId, array $details = [])
    {
        return self::create([
            'action' => 'view',
            'performed_by' => $userId,
            'user_role' => $userRole,
            'target_collection' => $collection,
            'target_id' => $targetId,
            'details' => $details,
            'timestamp' => now(),
        ]);
    }

    /**
     * Static method: Log a login action
     */
    public static function logLogin(int $userId, string $userRole, array $details = [])
    {
        return self::create([
            'action' => 'login',
            'performed_by' => $userId,
            'user_role' => $userRole,
            'target_collection' => 'users',
            'target_id' => $userId,
            'details' => array_merge($details, [
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]),
            'timestamp' => now(),
        ]);
    }

    /**
     * Static method: Log a logout action
     */
    public static function logLogout(int $userId, string $userRole, array $details = [])
    {
        return self::create([
            'action' => 'logout',
            'performed_by' => $userId,
            'user_role' => $userRole,
            'target_collection' => 'users',
            'target_id' => $userId,
            'details' => array_merge($details, [
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]),
            'timestamp' => now(),
        ]);
    }

    /**
     * Static method: Log a failed login attempt
     */
    public static function logFailedLogin(string $email, array $details = [])
    {
        return self::create([
            'action' => 'failed_login',
            'performed_by' => null,
            'user_role' => 'unknown',
            'target_collection' => 'authentication',
            'target_id' => null,
            'details' => array_merge($details, [
                'email' => $email,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]),
            'timestamp' => now(),
        ]);
    }

    /**
     * Static method: Log password change
     */
    public static function logPasswordChange(int $userId, string $userRole, array $details = [])
    {
        return self::create([
            'action' => 'password_change',
            'performed_by' => $userId,
            'user_role' => $userRole,
            'target_collection' => 'users',
            'target_id' => $userId,
            'details' => array_merge($details, [
                'ip_address' => request()->ip(),
            ]),
            'timestamp' => now(),
        ]);
    }

    /**
     * Static method: Log permission change
     */
    public static function logPermissionChange(int $userId, string $userRole, int $targetId, string $permission, string $action, array $details = [])
    {
        return self::create([
            'action' => 'permission_' . $action,
            'performed_by' => $userId,
            'user_role' => $userRole,
            'target_collection' => 'permissions',
            'target_id' => $targetId,
            'details' => array_merge($details, [
                'permission' => $permission,
                'action' => $action,
            ]),
            'timestamp' => now(),
        ]);
    }

    /**
     * Get activity summary for date range
     */
    public static function getActivitySummary($startDate, $endDate)
    {
        return self::selectRaw('action, COUNT(*) as count')
            ->whereBetween('timestamp', [$startDate, $endDate])
            ->groupBy('action')
            ->get();
    }

    /**
     * Get user's recent activity
     */
    public static function getUserActivity(int $userId, int $limit = 20)
    {
        return self::where('performed_by', $userId)
            ->orderBy('timestamp', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get suspicious activity (unverified records)
     */
    public static function getSuspiciousActivity($days = 7)
    {
        return self::where('is_verified', false)
            ->where('timestamp', '>=', now()->subDays($days))
            ->orderBy('timestamp', 'desc')
            ->get();
    }

    /**
     * Log deletion of audit record
     */
    public static function logAuditDeletion(int $auditLogId, int $userId, string $reason = '')
    {
        return self::create([
            'action' => 'audit_deletion',
            'performed_by' => $userId,
            'user_role' => 'admin',
            'target_collection' => 'audit_logs',
            'target_id' => $auditLogId,
            'details' => [
                'reason' => $reason,
                'ip_address' => request()->ip(),
            ],
            'timestamp' => now(),
        ]);
    }
}
