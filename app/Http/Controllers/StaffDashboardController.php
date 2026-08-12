<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ToothRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class StaffDashboardController extends Controller
{
    public function index()
    {
        // Tooth records
        $user = Auth::user();
        $toothRecords = ToothRecord::with(['patient', 'doctor'])
            ->when($user && $user->role === 'staff', function ($query) use ($user) {
                return $query->where('doctor_id', $user->id);
            })
            ->latest()
            ->limit(5)
            ->get();

        return Inertia::render('Staff/Dashboard', [
            'toothRecords' => $toothRecords,
        ]);
    }
}
