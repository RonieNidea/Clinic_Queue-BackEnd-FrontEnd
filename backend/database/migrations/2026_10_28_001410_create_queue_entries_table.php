<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queue_entries', function (Blueprint $table) {
            $table->id();

            // Walk-in patients do not need an online account.
            $table->string('patient_name');
            $table->string('department');
            $table->date('queue_date');
            $table->string('queue_number')->nullable()->unique();
            $table->string('status')->default('waiting');
            $table->string('registration_type')->default('walk_in');

            $table->foreignId('registered_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['queue_date', 'department', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_entries');
    }
};