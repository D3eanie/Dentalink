<?php

namespace App\Policies;

use App\Models\ToothChart;
use App\Models\User;

class ToothChartPolicy
{
    /**
     * Determine if user can view any tooth charts
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'staff']);
    }

    /**
     * Determine if user can view a tooth chart
     */
    public function view(User $user, ToothChart $chart): bool
    {
        // Admins and staff can view all
        if (in_array($user->role, ['admin', 'staff'])) {
            return true;
        }

        // Patients can view their own
        if ($user->role === 'patient' && $user->id === $chart->patient_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine if user can create tooth charts
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'staff']);
    }

    /**
     * Determine if user can delete tooth charts
     */
    public function delete(User $user, ToothChart $chart): bool
    {
        // Only admin or who created it
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'staff' && $chart->created_by === $user->id) {
            return true;
        }

        return false;
    }
}
