<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('patient');
            $table->string('department')->nullable();

            // Existing patient accounts remain approved.
            // Staff registration will explicitly set this to pending.
            $table->string('approval_status')->default('approved');

            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('approved_at')->nullable();

            $table->index(['role', 'approval_status']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropIndex(['role', 'approval_status']);

            $table->dropColumn([
                'role',
                'department',
                'approval_status',
                'approved_by',
                'approved_at',
            ]);
        });
    }
};