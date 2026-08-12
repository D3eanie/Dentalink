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
        Schema::table('appointments', function (Blueprint $table) {
            // Add timestamp for when appointment was confirmed (winner of race)
            // Only add if it doesn't already exist
            if (!Schema::hasColumn('appointments', 'booking_confirmed_at')) {
                $table->timestamp('booking_confirmed_at')->nullable()->after('notes');
            }
        });

        // Add index for race case queries (use shorter name to avoid MySQL identifier length limit)
        if (!Schema::hasColumn('appointments', 'appointment_date')) {
            // Index can only be added if table exists, which it does
            DB::statement("ALTER TABLE appointments ADD INDEX idx_race_case_booking (appointment_date, appointment_time, doctor_id)");
        }

        // Update the enum status to include 'pending_confirmation'
        // This is handled by modifying the enum constraint in the database
        // For MySQL, we need to alter the enum type
        try {
            DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('scheduled', 'confirmed', 'pending_confirmation', 'checked_in', 'not_available', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled'");
        } catch (\Exception $e) {
            // Index might already exist, that's okay
            \Illuminate\Support\Facades\Log::warning("Could not modify status enum: " . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('idx_race_case_booking');
            $table->dropColumn('booking_confirmed_at');
        });

        // Revert the enum type
        DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('scheduled', 'confirmed', 'checked_in', 'not_available', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled'");
    }
};
