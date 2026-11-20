<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name')->unique();
            $table->string('service_name');
            $table->decimal('fee', 10, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $defaults = [
            'General Medicine' => [
                'service_name' => 'General Consultation',
                'fee' => 50,
            ],
            'Nursing Assistance' => [
                'service_name' => 'Nursing Assistance',
                'fee' => 30,
            ],
            'Basic First Aid' => [
                'service_name' => 'Basic First Aid',
                'fee' => 20,
            ],
            'Health Assessment' => [
                'service_name' => 'Health Assessment',
                'fee' => 40,
            ],
        ];

        $names = array_keys($defaults);

        // Preserve any other department values already used by records.
        foreach ([
            'users',
            'appointments',
            'queue_entries',
            'visits',
            'appointment_blocks',
            'staff_invitations',
        ] as $table) {
            if (
                Schema::hasTable($table) &&
                Schema::hasColumn($table, 'department')
            ) {
                $existing = DB::table($table)
                    ->whereNotNull('department')
                    ->distinct()
                    ->pluck('department')
                    ->all();

                $names = array_merge($names, $existing);
            }
        }

        foreach (array_unique($names) as $name) {
            if (trim($name) === '') {
                continue;
            }

            DB::table('departments')->insert([
                // Existing records already contain this exact value.
                'code' => $name,
                'name' => $name,
                'service_name' => $defaults[$name]['service_name'] ?? $name,
                'fee' => $defaults[$name]['fee'] ?? null,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};