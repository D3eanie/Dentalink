<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PatientRecord;
use App\Models\Appointment;
use App\Models\User;
use App\Models\AuditLog;
use App\Services\BlockchainService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PatientRecordController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $doctor = $request->input('doctor');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $records = PatientRecord::with(['patient', 'appointment', 'createdBy'])
            ->when($search, function ($query, $search) {
                return $query->whereHas('patient', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%");
                });
            })
            ->when($doctor, function ($query, $doctor) {
                return $query->where('created_by', $doctor);
            })
            ->when($dateFrom, function ($query, $dateFrom) {
                return $query->whereDate('created_at', '>=', $dateFrom);
            })
            ->when($dateTo, function ($query, $dateTo) {
                return $query->whereDate('created_at', '<=', $dateTo);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        $doctors = User::staff()->where('position', 'dentist')->get();

        return Inertia::render('PatientRecords/Index', [
            'records' => $records,
            'doctors' => $doctors,
            'filters' => $request->only(['search', 'doctor', 'date_from', 'date_to']),
        ]);
    }

    public function create(Request $request)
    {
        $appointmentId = $request->input('appointment_id');
        $appointment = null;
        
        if ($appointmentId) {
            $appointment = Appointment::with(['patient', 'service'])->find($appointmentId);
        }

        $patients = User::patients()->active()->orderBy('name')->get();

        return Inertia::render('PatientRecords/Create', [
            'appointment' => $appointment,
            'patients' => $patients,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:users,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'treatment_notes' => 'required|string',
            'diagnosis' => 'required|string',
            'procedures_performed' => 'required|array',
            'procedures_performed.*' => 'string',
            'recommendations' => 'nullable|string',
            'follow_up_instructions' => 'nullable|string',
        ]);

        $record = PatientRecord::create([
            ...$validated,
            'created_by' => Auth::id(),
        ]);

        // Record to blockchain with hash chain
        BlockchainService::recordPatientRecordCreated(
            Auth::id(),
            Auth::user()->role,
            $record,
            [
                'procedures_count' => count($validated['procedures_performed']),
                'diagnosis' => $record->diagnosis,
            ]
        );

        return redirect()->route('patient-records.show', $record)
            ->with('success', 'Patient record created successfully.');
    }

    public function show(PatientRecord $patientRecord)
    {
        $patientRecord->load(['patient.patient', 'appointment.service', 'createdBy']);

        // Log access to the record (for audit trail)
        BlockchainService::recordPatientRecordAccessed(
            Auth::id(),
            Auth::user()->role,
            $patientRecord->id,
            $patientRecord->patient->name
        );

        // Get the blockchain chain for this record
        $blockchain_chain = BlockchainService::getPatientRecordChain($patientRecord->id);

        return Inertia::render('PatientRecords/Show', [
            'record' => $patientRecord,
            'blockchain_chain' => $blockchain_chain,
        ]);
    }

    public function edit(PatientRecord $patientRecord)
    {
        $patientRecord->load(['patient', 'appointment']);
        $patients = User::patients()->active()->orderBy('name')->get();

        return Inertia::render('PatientRecords/Edit', [
            'record' => $patientRecord,
            'patients' => $patients,
        ]);
    }

    public function update(Request $request, PatientRecord $patientRecord)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:users,id',
            'treatment_notes' => 'required|string',
            'diagnosis' => 'required|string',
            'procedures_performed' => 'required|array',
            'procedures_performed.*' => 'string',
            'recommendations' => 'nullable|string',
            'follow_up_instructions' => 'nullable|string',
        ]);

        $patientRecord->update($validated);

        // Record update to blockchain
        BlockchainService::recordPatientRecordUpdated(
            Auth::id(),
            Auth::user()->role,
            $patientRecord,
            array_keys($validated)
        );

        return redirect()->route('patient-records.show', $patientRecord)
            ->with('success', 'Patient record updated successfully.');
    }

    public function destroy(PatientRecord $patientRecord)
    {
        $patientName = $patientRecord->patient->name;
        $recordId = $patientRecord->id;

        // Record deletion to blockchain BEFORE deleting
        BlockchainService::recordPatientRecordDeleted(
            Auth::id(),
            Auth::user()->role,
            $recordId,
            [
                'patient_name' => $patientName,
                'diagnosis' => $patientRecord->diagnosis,
            ]
        );

        $patientRecord->delete();

        return redirect()->route('patient-records.index')
            ->with('success', 'Patient record deleted successfully.');
    }

    /**
     * Get blockchain chain for a specific patient record
     */
    public function getBlockchainChain(PatientRecord $patientRecord)
    {
        $chain = BlockchainService::getPatientRecordChain($patientRecord->id);

        return response()->json($chain);
    }

    /**
     * Export patient record with blockchain proof
     */
    public function exportWithBlockchain(PatientRecord $patientRecord)
    {
        $patientRecord->load(['patient.patient', 'appointment.service', 'createdBy']);
        $chain = BlockchainService::getPatientRecordChain($patientRecord->id);

        $exportData = [
            'record' => $patientRecord,
            'blockchain_chain' => $chain,
            'exported_at' => now(),
            'exported_by' => Auth::user()->name,
        ];

        return response()->json($exportData, 200, [
            'Content-Disposition' => 'attachment; filename="patient-record-' . $patientRecord->id . '-blockchain.json"',
        ]);
    }
}