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
        Schema::table('patients', function (Blueprint $table) {
            // Track the last appointment date to determine inactivity
            $table->timestamp('last_appointment_date')->nullable()->after('user_id');
            $table->index(['last_appointment_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndex(['last_appointment_date']);
            $table->dropColumn('last_appointment_date');
        });
    }
};
