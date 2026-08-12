<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\TreatmentPlan;
use App\Models\User;
use App\Models\Service;
use App\Models\Notification;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TreatmentPlanController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $status = $request->input('status');
        $doctor = $request->input('doctor');

        $treatmentPlans = TreatmentPlan::with(['patient', 'doctor'])
            ->when($search, function ($query, $search) {
                return $query->whereHas('patient', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%");
                })->orWhere('plan_title', 'like', "%{$search}%");
            })
            ->when($status, function ($query, $status) {
                return $query->where('status', $status);
            })
            ->when($doctor, function ($query, $doctor) {
                return $query->where('doctor_id', $doctor);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        $doctors = User::staff()->where('position', 'dentist')->get();

        return Inertia::render('TreatmentPlans/Index', [
            'treatmentPlans' => $treatmentPlans,
            'doctors' => $doctors,
            'filters' => $request->only(['search', 'status', 'doctor']),
        ]);
    }

    public function create()
    {
        $patients = User::patients()->active()->orderBy('name')->get();
        $doctors = User::staff()->where('position', 'dentist')->active()->get();
        $services = Service::active()->orderBy('name')->get();

        return Inertia::render('TreatmentPlans/Create', [
            'patients' => $patients,
            'doctors' => $doctors,
            'services' => $services,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:users,id',
            'doctor_id' => 'required|exists:users,id',
            'plan_title' => 'required|string|max:255',
            'diagnosis' => 'required|string',
            'planned_procedures' => 'required|array',
            'estimated_cost' => 'required|numeric|min:0',
            'start_date' => 'nullable|date|after_or_equal:today',
            'notes' => 'nullable|string',
        ]);

        $treatmentPlan = TreatmentPlan::create([
            ...$validated,
            'status' => 'draft',
        ]);

        Notification::createTreatmentNotification(
            $validated['patient_id'],
            'New Treatment Plan',
            "A new treatment plan '{$treatmentPlan->plan_title}' has been created for you."
        );

        AuditLog::logCreate(Auth::id(), Auth::user()->role, 'treatment_plans', $treatmentPlan->id, [
            'patient_name' => $treatmentPlan->patient->name,
            'plan_title' => $treatmentPlan->plan_title,
            'estimated_cost' => $treatmentPlan->estimated_cost,
        ]);

        return redirect()->route('treatment-plans.show', $treatmentPlan)
            ->with('success', 'Treatment plan created successfully.');
    }

    public function show(TreatmentPlan $treatmentPlan)
    {
        $treatmentPlan->load(['patient.patient', 'doctor']);

        return Inertia::render('TreatmentPlans/Show', [
            'treatmentPlan' => $treatmentPlan,
        ]);
    }

    public function edit(TreatmentPlan $treatmentPlan)
    {
        if (!$treatmentPlan->canBeEdited()) {
            return back()->with('error', 'Treatment plan cannot be edited in its current status.');
        }

        $treatmentPlan->load(['patient', 'doctor']);
        $patients = User::patients()->active()->orderBy('name')->get();
        $doctors = User::staff()->where('position', 'dentist')->active()->get();
        $services = Service::active()->orderBy('name')->get();

        return Inertia::render('TreatmentPlans/Edit', [
            'treatmentPlan' => $treatmentPlan,
            'patients' => $patients,
            'doctors' => $doctors,
            'services' => $services,
        ]);
    }

    public function update(Request $request, TreatmentPlan $treatmentPlan)
    {
        if (!$treatmentPlan->canBeEdited()) {
            return back()->with('error', 'Treatment plan cannot be edited in its current status.');
        }

        $validated = $request->validate([
            'patient_id' => 'required|exists:users,id',
            'doctor_id' => 'required|exists:users,id',
            'plan_title' => 'required|string|max:255',
            'diagnosis' => 'required|string',
            'planned_procedures' => 'required|array',
            'estimated_cost' => 'required|numeric|min:0',
            'start_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $treatmentPlan->update($validated);

        AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'treatment_plans', $treatmentPlan->id, [
            'updated_fields' => array_keys($validated),
        ]);

        return redirect()->route('treatment-plans.show', $treatmentPlan)
            ->with('success', 'Treatment plan updated successfully.');
    }

    public function approve(TreatmentPlan $treatmentPlan)
    {
        if ($treatmentPlan->approve()) {
            Notification::createTreatmentNotification(
                $treatmentPlan->patient_id,
                'Treatment Plan Approved',
                "Your treatment plan '{$treatmentPlan->plan_title}' has been approved."
            );

            AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'treatment_plans', $treatmentPlan->id, [
                'action' => 'approved',
            ]);

            return back()->with('success', 'Treatment plan approved successfully.');
        }

        return back()->with('error', 'Unable to approve treatment plan.');
    }

    public function start(TreatmentPlan $treatmentPlan)
    {
        if ($treatmentPlan->start()) {
            Notification::createTreatmentNotification(
                $treatmentPlan->patient_id,
                'Treatment Started',
                "Your treatment plan '{$treatmentPlan->plan_title}' has been started."
            );

            AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'treatment_plans', $treatmentPlan->id, [
                'action' => 'started',
            ]);

            return back()->with('success', 'Treatment plan started successfully.');
        }

        return back()->with('error', 'Unable to start treatment plan.');
    }

    public function complete(TreatmentPlan $treatmentPlan)
    {
        if ($treatmentPlan->complete()) {
            Notification::createTreatmentNotification(
                $treatmentPlan->patient_id,
                'Treatment Completed',
                "Your treatment plan '{$treatmentPlan->plan_title}' has been completed."
            );

            AuditLog::logUpdate(Auth::id(), Auth::user()->role, 'treatment_plans', $treatmentPlan->id, [
                'action' => 'completed',
            ]);

            return back()->with('success', 'Treatment plan completed successfully.');
        }

        return back()->with('error', 'Unable to complete treatment plan.');
    }
}