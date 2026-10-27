<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('queue_entries', function (Blueprint $table) {
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('active_patient_key')->nullable()->unique();
        });

        // Link existing appointment queue entries to their owners.
        $entries = \Illuminate\Support\Facades\DB::table('queue_entries')
            ->whereNotNull('appointment_id')
            ->orderBy('id')
            ->get();

        foreach ($entries as $entry) {
            $userId = \Illuminate\Support\Facades\DB::table('appointments')
                ->where('id', $entry->appointment_id)
                ->value('user_id');

            \Illuminate\Support\Facades\DB::table('queue_entries')
                ->where('id', $entry->id)
                ->update(['user_id' => $userId]);
        }

        // Keep at most one active entry per account and day.
        // Cancel later duplicates without deleting their records.
        $activeEntries = \Illuminate\Support\Facades\DB::table('queue_entries')
            ->whereNotNull('user_id')
            ->whereIn('status', ['waiting', 'serving'])
            ->orderByRaw("CASE WHEN status = 'serving' THEN 0 ELSE 1 END")
            ->orderBy('id')
            ->get();

        $seen = [];

        foreach ($activeEntries as $entry) {
            $key = $entry->user_id.'|'.$entry->queue_date;

            if (isset($seen[$key])) {
                \Illuminate\Support\Facades\DB::table('queue_entries')
                    ->where('id', $entry->id)
                    ->update([
                        'status' => 'cancelled',
                        'active_patient_key' => null,
                    ]);

                continue;
            }

            $seen[$key] = true;

            \Illuminate\Support\Facades\DB::table('queue_entries')
                ->where('id', $entry->id)
                ->update(['active_patient_key' => $key]);
        }
    }

    public function down(): void
    {
        Schema::table('queue_entries', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropUnique(['active_patient_key']);
            $table->dropColumn(['user_id', 'active_patient_key']);
        });
    }
};