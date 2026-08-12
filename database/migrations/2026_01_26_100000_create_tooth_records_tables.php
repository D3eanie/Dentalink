<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Tooth records - Track treatment history per individual tooth
        Schema::create('tooth_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');

            // Optional relationships
            $table->foreignId('patient_record_id')->nullable()->constrained('patient_records')->onDelete('cascade');
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->onDelete('set null');
            $table->foreignId('service_id')->nullable()->constrained('services')->onDelete('set null');

            // Tooth identification using FDI numbering system (11-48)
            $table->integer('tooth_number'); // 11-48 (FDI notation)
            $table->string('tooth_position')->nullable(); // "Upper Right", "Upper Left", etc.
            $table->string('surface')->nullable(); // "Occlusal", "Mesial", "Distal", "Buccal", "Lingual"

            // Treatment details
            $table->string('service'); // e.g., "Filling", "Crown", "Root Canal", "Extraction", "Cleaning"
            $table->string('treatment_type')->nullable(); // More detailed treatment classification
            $table->text('treatment_description')->nullable();

            // Materials
            $table->string('material_type')->nullable(); // "Amalgam", "Composite", "Porcelain", etc.
            $table->json('materials_used')->nullable(); // Array of materials used

            // Tooth status and condition
            $table->string('tooth_status')->nullable(); // "healthy", "treatment_needed", "treated", "extracted", "missing", "implant"
            $table->string('tooth_condition')->nullable(); // "intact", "decay", "crack", "wear", etc.

            // Notes
            $table->text('notes')->nullable();
            $table->text('clinical_notes')->nullable();

            // Dates
            $table->date('date_done');
            $table->dateTime('treatment_date')->nullable();
            $table->dateTime('next_review_date')->nullable();

            $table->timestamps();

            // Indexes for fast queries
            $table->index(['patient_id']);
            $table->index(['doctor_id']);
            $table->index(['patient_record_id']);
            $table->index(['tooth_number']);
            $table->index(['date_done']);
            $table->index(['treatment_date']);
            $table->index(['next_review_date']);
            $table->index(['tooth_status']);
        });

        // Tooth chart snapshots - Store complete mouth charts for reference
        Schema::create('tooth_charts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');

            // Store tooth status snapshot as JSON
            $table->json('tooth_statuses'); // { "11": "healthy", "12": "treated", ... }

            // Tracking
            $table->string('chart_type'); // "examination", "treatment_plan", "post_treatment"
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');

            $table->timestamps();

            $table->index(['patient_id']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tooth_charts');
        Schema::dropIfExists('tooth_records');
    }
};
