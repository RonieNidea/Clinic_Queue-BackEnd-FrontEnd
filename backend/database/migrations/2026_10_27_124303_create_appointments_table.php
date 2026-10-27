<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('patient_name');
            $table->string('department');
            $table->date('appointment_date');
            $table->string('appointment_time', 5);
            $table->text('reason')->nullable();
            $table->string('status')->default('booked');

            // Prevent duplicate active bookings while allowing cancelled
            // appointments to remain stored and their slots to be reused.
            $table->string('active_slot')->nullable()->unique();

            $table->timestamps();

            $table->index(['department', 'appointment_date', 'status']);
            $table->index(['user_id', 'appointment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};