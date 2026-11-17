<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_blocks', function (Blueprint $table) {
            $table->id();
            $table->string('department');
            $table->date('block_date');

            // Times use Philippine time and 24-hour HH:mm format.
            $table->string('start_time', 5);
            $table->string('end_time', 5);

            $table->string('reason', 255);

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['department', 'block_date']);
        });

        // Coordinates booking and blocking requests so they
        // cannot reserve the same time simultaneously.
        Schema::create('clinic_schedule_locks', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
        });

        DB::table('clinic_schedule_locks')->insert(['id' => 1]);
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_blocks');
        Schema::dropIfExists('clinic_schedule_locks');
    }
};