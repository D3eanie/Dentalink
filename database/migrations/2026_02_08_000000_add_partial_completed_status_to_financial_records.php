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
        // Modify the payment_status enum to add 'partial_completed'
        DB::statement("ALTER TABLE financial_records MODIFY COLUMN payment_status ENUM('pending', 'paid', 'partial', 'partial_completed', 'overdue') NOT NULL DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original enum values
        DB::statement("ALTER TABLE financial_records MODIFY COLUMN payment_status ENUM('pending', 'paid', 'partial', 'overdue') NOT NULL DEFAULT 'pending'");
    }
};
