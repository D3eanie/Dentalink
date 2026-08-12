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
        Schema::table('notifications', function (Blueprint $table) {
            // Add email_verification type to enum and include existing transaction type
            $table->enum('type', ['appointment', 'reminder', 'treatment', 'system', 'email_verification', 'transaction'])
                ->default('system')
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            // Revert to original enum without email_verification and transaction
            $table->enum('type', ['appointment', 'reminder', 'treatment', 'system'])
                ->default('system')
                ->change();
        });
    }
};
