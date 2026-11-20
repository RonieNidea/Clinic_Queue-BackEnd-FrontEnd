<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('queue_entries', function (Blueprint $table) {
            $table->timestamp('called_at')->nullable();
            $table->timestamp('arrived_at')->nullable();
            $table->timestamp('no_show_at')->nullable();

            // One called/serving patient per department and queue day.
            $table->string('serving_key')->nullable()->unique();

            $table->foreignId('handled_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('queue_entries', function (Blueprint $table) {
            $table->dropForeign(['handled_by']);
            $table->dropUnique(['serving_key']);

            $table->dropColumn([
                'called_at',
                'arrived_at',
                'no_show_at',
                'serving_key',
                'handled_by',
            ]);
        });
    }
};