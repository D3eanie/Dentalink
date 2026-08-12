<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // First, update existing records
        DB::table('appointments')
            ->where('status', 'in_progress')
            ->update(['status' => 'not_available']);

        // Then alter the enum column to replace 'in_progress' with 'not_available'
        // Note: MySQL requires redefining the entire enum
        DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('scheduled', 'confirmed', 'checked_in', 'not_available', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'scheduled'");
    }

    public function down(): void
    {
        // Update existing records back
        DB::table('appointments')
            ->where('status', 'not_available')
            ->update(['status' => 'in_progress']);

        // Restore the original enum
        DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'scheduled'");
    }
};

