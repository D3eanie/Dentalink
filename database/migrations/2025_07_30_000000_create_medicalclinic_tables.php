<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for UpNorth Dental Clinic Management System
     * WITH BLOCKCHAIN-STYLE HASH CHAINING (No MetaMask, No Crypto)
     */
    public function up(): void
    {
        // Users table - All users (patients, staff, admins)
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('role', ['patient', 'staff', 'admin'])->default('patient');
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            
            // Staff-specific fields (only used if role is 'staff' or 'admin')
            $table->string('employee_id')->nullable()->unique();
            $table->string('position')->nullable(); // dentist, hygienist, receptionist
            $table->string('license_number')->nullable();
            $table->date('license_expiry')->nullable();
            $table->date('hire_date')->nullable();
            $table->decimal('hourly_rate', 8, 2)->nullable();
            $table->json('specializations')->nullable(); // orthodontics, surgery, etc.
            $table->text('bio')->nullable();
            $table->integer('years_experience')->default(0);
            
            $table->rememberToken();
            $table->timestamps();

            $table->index(['role', 'status']);
            $table->index(['employee_id']);
        });

        // Patients table - Extended patient information (only for patients)
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('birthday')->nullable();
            $table->string('gender')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->string('emergency_contact_relationship')->nullable();
            $table->string('insurance_provider')->nullable();
            $table->string('insurance_number')->nullable();
            $table->text('medical_history')->nullable();
            $table->text('allergies')->nullable();
            $table->text('current_medications')->nullable();
            $table->enum('blood_type', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])->nullable();
            $table->timestamps();

            $table->index(['birthday']);
            $table->index(['gender']);
        });

        // Services offered by the clinic
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->integer('duration_minutes')->default(30);
            $table->enum('category', ['preventive', 'restorative', 'cosmetic', 'surgical', 'emergency'])->default('preventive');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Appointments management
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade'); // staff member
            $table->foreignId('service_id')->constrained()->onDelete('cascade');
            $table->datetime('appointment_date');
            $table->time('appointment_time');
            $table->integer('duration_minutes')->default(30);
            $table->enum('status', ['scheduled', 'confirmed', 'checked_in', 'not_available', 'completed', 'cancelled', 'no_show'])->default('scheduled');
            $table->timestamp('checked_in_at')->nullable();
            $table->text('reason_for_visit')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['patient_id', 'appointment_date']);
            $table->index(['doctor_id', 'appointment_date']);
            $table->index(['status', 'appointment_date']);
        });

        // Patient Records - Treatment history and notes
        Schema::create('patient_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('appointment_id')->nullable()->constrained()->onDelete('set null');
            $table->text('treatment_notes');
            $table->text('diagnosis')->nullable();
            $table->json('procedures_performed')->nullable();
            $table->text('recommendations')->nullable();
            $table->text('follow_up_instructions')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index(['patient_id', 'created_at']);
        });

        // Treatment Plans
        Schema::create('treatment_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            $table->string('plan_title');
            $table->text('diagnosis');
            $table->json('planned_procedures')->nullable();
            $table->decimal('estimated_cost', 10, 2)->nullable();
            $table->date('start_date')->nullable();
            $table->enum('status', ['draft', 'approved', 'in_progress', 'completed'])->default('draft');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['patient_id', 'status']);
        });

        // Staff schedules and availability
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('users')->onDelete('cascade');
            $table->date('date');
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('is_available')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['staff_id', 'date']);
            $table->index(['date', 'is_available']);
        });

        // Notifications system
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('message');
            $table->enum('type', ['appointment', 'reminder', 'treatment', 'system'])->default('system');
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_read']);
        });

        // Financial Records for billing
        Schema::create('financial_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('appointment_id')->nullable()->constrained()->onDelete('set null');
            $table->decimal('amount', 10, 2);
            $table->enum('payment_status', ['pending', 'paid', 'partial', 'overdue'])->default('pending');
            $table->enum('payment_method', ['cash', 'credit_card', 'insurance', 'check'])->nullable();
            $table->date('transaction_date');
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['patient_id', 'payment_status']);
        });

        // ========================================
        // BLOCKCHAIN-STYLE HASH CHAINING TABLES
        // NO MetaMask, NO Crypto - Pure Laravel
        // ========================================

        // Audit Logs for system tracking - WITH HASH CHAIN
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('action'); // create, update, delete, view
            $table->foreignId('performed_by')->constrained('users')->onDelete('cascade');
            $table->enum('user_role', ['patient', 'staff', 'admin']);
            $table->string('target_collection'); // table name
            $table->unsignedBigInteger('target_id')->nullable();
            $table->json('details')->nullable();
            $table->timestamp('timestamp');
            
            // BLOCKCHAIN-STYLE: Hash Chaining
            // Each record links to previous one via hash
            $table->string('current_hash')->unique(); // SHA256 hash OF THIS RECORD
            $table->string('previous_hash')->nullable(); // SHA256 hash OF PREVIOUS RECORD
            $table->boolean('is_verified')->default(true); // FALSE = tampering detected!
            
            $table->timestamps();

            $table->index(['performed_by', 'timestamp']);
            $table->index(['action', 'timestamp']);
            $table->index(['current_hash']);
            $table->index(['previous_hash']);
            $table->index(['is_verified']);
        });

        // Track hash chain integrity
        Schema::create('hash_chain_verifications', function (Blueprint $table) {
            $table->id();
            $table->string('table_name'); // Which table's chain (audit_logs, financial_records)
            $table->unsignedBigInteger('last_record_id'); // Last record ID checked
            $table->string('last_hash'); // Last record's hash
            $table->integer('records_verified'); // Total records in chain
            $table->boolean('chain_valid')->default(true); // Is chain intact?
            $table->json('tampering_detected')->nullable(); // Array of tampered record IDs
            $table->foreignId('verified_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('verified_at');
            $table->timestamps();

            $table->index(['table_name', 'verified_at']);
            $table->index(['chain_valid']);
        });

        // Password reset tokens table
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // Sessions table
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('hash_chain_verifications');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('financial_records');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('schedules');
        Schema::dropIfExists('treatment_plans');
        Schema::dropIfExists('patient_records');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('services');
        Schema::dropIfExists('patients');
        Schema::dropIfExists('users');
    }
};