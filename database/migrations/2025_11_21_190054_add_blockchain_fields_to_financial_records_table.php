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
            // Blockchain protection fields
            $table->string('blockchain_hash')->nullable()->unique()->after('notes');
            $table->string('previous_blockchain_hash')->nullable()->after('blockchain_hash');
            $table->boolean('is_verified')->default(true)->after('previous_blockchain_hash');
            $table->timestamp('verified_at')->nullable()->after('is_verified');
            $table->foreignId('verified_by')->nullable()->constrained('users')->onDelete('set null')->after('verified_at');
            
            // Indexes for faster blockchain verification queries
            $table->index('blockchain_hash');
            $table->index('previous_blockchain_hash');
            $table->index('is_verified');
            $table->index(['is_verified', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('financial_records', function (Blueprint $table) {
            $table->dropForeign(['verified_by']);
            $table->dropIndex(['blockchain_hash']);
            $table->dropIndex(['previous_blockchain_hash']);
            $table->dropIndex(['is_verified']);
            $table->dropIndex(['is_verified', 'created_at']);
            $table->dropColumn([
                'blockchain_hash',
                'previous_blockchain_hash',
                'is_verified',
                'verified_at',
                'verified_by',
            ]);
        });
    }
};
