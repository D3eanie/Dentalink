<?php

namespace App\Policies;

use App\Models\ToothRecord;
use App\Models\User;

class ToothRecordPolicy
{
    /**
     * Determine if user can view any tooth records
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'staff']);
    }

    /**
     * Determine if user can view a tooth record
     */
    public function view(User $user, $recordOrPatientId = null): bool
    {
        $allowed = false;
        // Admins and staff can view all
        if (in_array($user->role, ['admin', 'staff'])) {
            $allowed = true;
        } elseif ($user->role === 'patient') {
            if ($recordOrPatientId instanceof ToothRecord) {
                $allowed = $user->id === $recordOrPatientId->patient_id;
            } elseif (is_numeric($recordOrPatientId)) {
                $allowed = $user->id === (int) $recordOrPatientId;
            }
        }

        return $allowed;
    }

    /**
     * Determine if user can create tooth records
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'staff']);
    }

    /**
     * Determine if user can update tooth records
     */
    public function update(User $user, ToothRecord $record): bool
    {
        return $this->canManageRecord($user, $record);
    }

    /**
     * Determine if user can delete tooth records
     */
    public function delete(User $user, ToothRecord $record): bool
    {
        return $this->canManageRecord($user, $record);
    }

    private function canManageRecord(User $user, ToothRecord $record): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        return $user->role === 'staff' && $record->doctor_id === $user->id;
    }
}
