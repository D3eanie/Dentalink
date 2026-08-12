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
        Schema::table('financial_records', function (Blueprint $table) {
            // Add balance column first if it doesn't exist
            if (!Schema::hasColumn('financial_records', 'balance')) {
                $table->decimal('balance', 10, 2)->default(0)->after('amount');
            }

            if (!Schema::hasColumn('financial_records', 'is_partial_payment')) {
                $table->boolean('is_partial_payment')->default(false)->after('balance');
            }

            if (!Schema::hasColumn('financial_records', 'parent_record_id')) {
                $table->foreignId('parent_record_id')->nullable()->after('is_partial_payment')->constrained('financial_records')->onDelete('cascade');
            }

            if (!Schema::hasColumn('financial_records', 'total_service_amount')) {
                $table->decimal('total_service_amount', 10, 2)->nullable()->after('parent_record_id');
            }

            // Indexes for performance
            if (!Schema::hasColumn('financial_records', 'parent_record_id')) {
                $table->index('parent_record_id');
            }

            if (!Schema::hasColumn('financial_records', 'appointment_id')) {
                $table->index(['appointment_id', 'is_partial_payment']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('financial_records', function (Blueprint $table) {
            $table->dropIndex(['financial_records_parent_record_id_index']);
            $table->dropIndex(['financial_records_appointment_id_is_partial_payment_index']);
            $table->dropForeign(['parent_record_id']);
            $table->dropColumn(['is_partial_payment', 'parent_record_id', 'total_service_amount']);
        });
    }
};
