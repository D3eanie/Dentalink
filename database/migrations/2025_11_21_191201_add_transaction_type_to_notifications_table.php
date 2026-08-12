<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify the enum to include 'transaction' type
        DB::statement("ALTER TABLE notifications MODIFY COLUMN `type` ENUM('appointment', 'reminder', 'treatment', 'transaction', 'system') NOT NULL DEFAULT 'system'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original enum values
        DB::statement("ALTER TABLE notifications MODIFY COLUMN `type` ENUM('appointment', 'reminder', 'treatment', 'system') NOT NULL DEFAULT 'system'");
    }
};
