<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visits', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('queue_entry_id')
                ->nullable()
                ->unique()
                ->constrained('queue_entries')
                ->nullOnDelete();

            $table->foreignId('recorded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('patient_name');
            $table->string('student_number')->nullable();
            $table->string('department');
            $table->string('service');
            $table->date('visit_date');

            $table->text('reason')->nullable();
            $table->text('summary')->nullable();
            $table->text('care_given')->nullable();
            $table->text('health_notes')->nullable();

            $table->string('status')->default('draft');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index('student_number');
            $table->index(['user_id', 'visit_date']);
            $table->index(['department', 'visit_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};