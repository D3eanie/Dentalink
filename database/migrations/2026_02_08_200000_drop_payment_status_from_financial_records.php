<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Temporarily disable foreign key checks
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        try {
            Schema::table('financial_records', function (Blueprint $table) {
                // Drop the index by name
                $table->dropIndex('financial_records_patient_id_payment_status_index');
                // Drop the payment_status column
                $table->dropColumn('payment_status');
            });
        } finally {
            // Re-enable foreign key checks
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }
    }

    public function down(): void
    {
        Schema::table('financial_records', function (Blueprint $table) {
            $table->enum('payment_status', ['pending', 'paid', 'partial', 'overdue'])
                ->default('pending')
                ->after('balance');
            $table->index(['patient_id', 'payment_status']);
        });
    }
};
