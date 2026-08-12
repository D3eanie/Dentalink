<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HashChainVerification extends Model
{
    protected $table = 'hash_chain_verifications';

    protected $fillable = [
        'table_name',
        'last_record_id',
        'last_hash',
        'records_verified',
        'chain_valid',
        'tampering_detected',
        'verified_by',
        'verified_at',
    ];

    protected $casts = [
        'tampering_detected' => 'array', // JSON to array
        'chain_valid' => 'boolean',
        'verified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship: User who performed verification
     */
    public function verifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * Get latest verification for a table
     */
    public static function getLatestVerification(string $tableName = 'audit_logs')
    {
        return self::where('table_name', $tableName)
            ->orderBy('verified_at', 'desc')
            ->first();
    }

    /**
     * Check if chain is currently valid
     */
    public function isChainValid(): bool
    {
        return $this->chain_valid;
    }

    /**
     * Get tampering details
     */
    public function getTamperingDetails(): ?array
    {
        return $this->tampering_detected;
    }

    /**
     * Count tampered records
     */
    public function getTamperingCount(): int
    {
        return $this->tampering_detected ? count($this->tampering_detected) : 0;
    }
}