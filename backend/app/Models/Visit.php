<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'user_id',
    'queue_entry_id',
    'recorded_by',
    'patient_name',
    'student_number',
    'department',
    'service',
    'visit_date',
    'reason',
    'summary',
    'care_given',
    'health_notes',
    'status',
    'completed_at',
])]
class Visit extends Model
{
    protected function casts(): array
    {
        return [
            'visit_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function queueEntry(): BelongsTo
    {
        return $this->belongsTo(QueueEntry::class);
    }
        public function rating(): HasOne
    {
        return $this->hasOne(VisitRating::class);
    }
}