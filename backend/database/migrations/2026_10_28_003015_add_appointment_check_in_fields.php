<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->timestamp('checked_in_at')->nullable();
        });

        Schema::table('queue_entries', function (Blueprint $table) {
            $table->foreignId('appointment_id')
                ->nullable()
                ->unique()
                ->constrained('appointments')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('queue_entries', function (Blueprint $table) {
            $table->dropForeign(['appointment_id']);
            $table->dropUnique(['appointment_id']);
            $table->dropColumn('appointment_id');
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('checked_in_at');
        });
    }
};