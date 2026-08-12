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
        Schema::table('tooth_records', function (Blueprint $table) {
            // Change tooth_number from integer to string to support ranges like "11-28"
            $table->string('tooth_number')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tooth_records', function (Blueprint $table) {
            // Revert to integer in case we need to rollback
            $table->integer('tooth_number')->change();
        });
    }
};
