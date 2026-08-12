<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Change is_verified default from true to false
     * Records should only be verified explicitly by admins, not automatically
     */
    public function up(): void
    {
        // First, add a default constraint of false
        Schema::table('financial_records', function (Blueprint $table) {
            $table->boolean('is_verified')->default(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('financial_records', function (Blueprint $table) {
            $table->boolean('is_verified')->default(true)->change();
        });
    }
};
