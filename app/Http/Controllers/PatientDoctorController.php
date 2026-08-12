<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Schedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PatientDoctorController extends Controller
{
    /**
     * Get active doctors (staff) available for patient booking.
     * Returns doctors who have available schedules (upcoming or today).
     * Doctors are filtered based on their schedule availability, not specialization.
     */
    public function index(Request $request)
    {
        try {
            $doctors = User::staff()
                ->active()
                ->whereHas('schedules', function ($query) {
                    $query->where('is_available', true)
                          ->where('date', '>=', now()->startOfDay());
                })
                ->orderBy('name')
                ->get(['id', 'name', 'position']);

            return response()->json([
                'success' => true,
                'data' => $doctors,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching available doctors for patients: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to load doctors.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}


